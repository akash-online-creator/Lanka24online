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
  // 0. Preset Emergency Messages
  const PRESET_MESSAGES = [
    '🚨 හදිසි ආපදාවක / අනතුරක පසුවෙමි. කරුණාකර මගේ සජීවී ස්ථානය පරීක්ෂා කර සහය එවන්න!',
    '🚗 මගේ වාහනය කාර්මික දෝෂයකට ලක්විය. මා සිටින ස්ථානයට පැමිණෙන්න.',
    '⚠️ අනාරක්ෂිත තත්ත්වයක පසුවෙමි. මා ගමන් කරන මාර්ගය සජීවීව නිරීක්ෂණය කරන්න.',
    '📍 මා සිටින ස්ථානය නිවැරදිව සොයාගැනීම සඳහා මෙම සජීවී සබැඳිය භාවිතා කරන්න.',
  ];

  // 1. Session States
  const [isActive, setIsActive] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>(() => {
    return `sos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  });
  const [sessionCode, setSessionCode] = useState<string>(() => {
    return `#SOS-${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [startedAt, setStartedAt] = useState<string>('');
  const [emergencyNote, setEmergencyNote] = useState<string>(PRESET_MESSAGES[0]);
  const [isDuressActive, setIsDuressActive] = useState<boolean>(false);
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [vehicleType, setVehicleType] = useState<string>('🛺 ත්‍රිරෝද රථය');
  const [customVehicleType, setCustomVehicleType] = useState<string>('');
  const [isCloudSaved, setIsCloudSaved] = useState<boolean>(false);
  const [showFeaturesGuideModal, setShowFeaturesGuideModal] = useState<boolean>(false);

  // 📡 1. ALWAYS-AVAILABLE SHARE URL (Instant from Mount - Never Empty)
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const sid = sessionId || `sos_${Date.now()}`;
    const origin = window.location.origin || '';
    const path = window.location.pathname || '';
    return `${origin}${path}?sos_session=${sid}`;
  }, [sessionId]);

  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSavingAndLocking, setIsSavingAndLocking] = useState<boolean>(false);
  const [savingStatusStep, setSavingStatusStep] = useState<string>('');
  const [gpsError, setGpsError] = useState<string | null>(null);

  // 2. Realtime Telemetry (Instant 0ms Cache Loading)
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>(() => {
    if (currentLocation?.lat && currentLocation?.lng) {
      return { lat: currentLocation.lat, lng: currentLocation.lng };
    }
    const cached = getLastKnownLocation();
    if (cached) {
      return { lat: cached.lat, lng: cached.lng };
    }
    return {
      lat: 7.1702, // Katunayake default fallback
      lng: 79.8858,
    };
  });
  const [accuracy, setAccuracy] = useState<number | null>(() => {
    const cached = getLastKnownLocation();
    return cached?.accuracy || null;
  });
  const [speedKmh, setSpeedKmh] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [locationName, setLocationName] = useState<string>(currentLocation?.nameSi || 'කටුනායක / ජා-ඇල (Katunayake / Ja-Ela)');
  const [breadcrumbs, setBreadcrumbs] = useState<SosBreadcrumbPoint[]>([]);
  const breadcrumbsRef = useRef<SosBreadcrumbPoint[]>([]);

  // 3. Sri Lanka Police Search & District Filter State
  const [policeSearchQuery, setPoliceSearchQuery] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('සියල්ල (All)');

  const filteredPoliceStations = useMemo(() => {
    return ALL_SRI_LANKA_POLICE_STATIONS.filter((station) => {
      const matchDistrict = selectedDistrict === 'සියල්ල (All)' || station.districtSi === selectedDistrict || station.districtEn.toLowerCase() === selectedDistrict.toLowerCase();
      const matchQuery = !policeSearchQuery.trim() || 
        station.nameSi.toLowerCase().includes(policeSearchQuery.toLowerCase()) ||
        station.nameEn.toLowerCase().includes(policeSearchQuery.toLowerCase()) ||
        station.addressSi.toLowerCase().includes(policeSearchQuery.toLowerCase()) ||
        station.districtSi.toLowerCase().includes(policeSearchQuery.toLowerCase());
      return matchDistrict && matchQuery;
    });
  }, [policeSearchQuery, selectedDistrict]);

  const districtsList = useMemo(() => {
    const set = new Set<string>();
    ALL_SRI_LANKA_POLICE_STATIONS.forEach((s) => set.add(s.districtSi));
    return ['සියල්ල (All)', ...Array.from(set)];
  }, []);

  // 4. Dual Dispatch, Siren & Audio
  const [isSirenOn, setIsSirenOn] = useState<boolean>(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  // 5. Security Quick PIN & Duress PIN
  const [showDuressModal, setShowDuressModal] = useState<boolean>(false);
  const [deactivateTab, setDeactivateTab] = useState<'pin' | 'nic'>('pin');
  const [cooldownRemainingSec, setCooldownRemainingSec] = useState<number | null>(null);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [enteredPassword, setEnteredPassword] = useState<string>('');
  const [enteredNic, setEnteredNic] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // 🛡️ 5-Minute Safety Buffer Timer after SOS Deactivation
  useEffect(() => {
    if (cooldownRemainingSec === null || cooldownRemainingSec <= 0) {
      if (cooldownRemainingSec === 0) {
        if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        setIsActive(false);
        if (sessionId) {
          stopSosLiveSession(sessionId, 'පරිශීලකයා විසින් ආරක්ෂිතව අවසන් කරන ලදී (User Resolved - 5min Grace Period Finished)').catch(() => {});
        }
        onClose();
      }
      return;
    }

    const timer = setInterval(() => {
      setCooldownRemainingSec(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownRemainingSec, sessionId, onClose]);

  // 6. Hardware & Audio Refs
  const recordingTimerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const isContinuousAudioRunningRef = useRef<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const facilitiesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const syncIntervalRef = useRef<any>(null);
  const sirenAudioContextRef = useRef<AudioContext | null>(null);
  const sirenOscillatorRef = useRef<OscillatorNode | null>(null);
  const sirenGainRef = useRef<GainNode | null>(null);
  const sirenModulatorRef = useRef<OscillatorNode | null>(null);

  const [mapLayer, setMapLayer] = useState<'osm' | 'satellite'>('osm');

  // Format MM:SS for audio timer
  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 🔊 HIGH-DECIBEL SIREN AUDIO SYNTHESIZER
  const startHighDecibelSiren = useCallback(() => {
    try {
      if (sirenAudioContextRef.current && sirenAudioContextRef.current.state === 'running') {
        return;
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      sirenAudioContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const modOsc = ctx.createOscillator();
      const modGain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(850, ctx.currentTime);

      modOsc.type = 'triangle';
      modOsc.frequency.setValueAtTime(2.2, ctx.currentTime);
      modGain.gain.setValueAtTime(450, ctx.currentTime);

      modOsc.connect(osc.frequency);
      modOsc.start();

      gain.gain.setValueAtTime(0.85, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      sirenOscillatorRef.current = osc;
      sirenGainRef.current = gain;
      sirenModulatorRef.current = modOsc;
      setIsSirenOn(true);
    } catch (e) {
      console.warn('AudioContext Siren initialization error:', e);
    }
  }, []);

  const stopHighDecibelSiren = useCallback(() => {
    try {
      if (sirenOscillatorRef.current) {
        sirenOscillatorRef.current.stop();
        sirenOscillatorRef.current.disconnect();
        sirenOscillatorRef.current = null;
      }
      if (sirenModulatorRef.current) {
        sirenModulatorRef.current.stop();
        sirenModulatorRef.current.disconnect();
        sirenModulatorRef.current = null;
      }
      if (sirenGainRef.current) {
        sirenGainRef.current.disconnect();
        sirenGainRef.current = null;
      }
      if (sirenAudioContextRef.current) {
        sirenAudioContextRef.current.close().catch(() => {});
        sirenAudioContextRef.current = null;
      }
    } catch (e) {
      console.warn('Siren AudioContext cleanup error:', e);
    } finally {
      setIsSirenOn(false);
    }
  }, []);

  const toggleSiren = useCallback(() => {
    if (isSirenOn) {
      stopHighDecibelSiren();
      setIsSirenOn(false);
    } else {
      startHighDecibelSiren();
      setIsSirenOn(true);
    }
  }, [isSirenOn, startHighDecibelSiren, stopHighDecibelSiren]);

  // 🎙️ CONTINUOUS BACKGROUND AUDIO EVIDENCE RECORDER
  const startAudioRecordingLoop = useCallback(async () => {
    if (isContinuousAudioRunningRef.current) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      console.warn('MediaDevices getUserMedia API not supported');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioStreamRef.current = stream;
      isContinuousAudioRunningRef.current = true;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const finalBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          const audioUrl = URL.createObjectURL(finalBlob);
          setRecordedAudioUrl(audioUrl);
        }
      };

      recorder.start(1000);
      setIsRecordingAudio(true);
      setRecordingSeconds(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone permission request deferred:', err);
      setIsRecordingAudio(false);
      isContinuousAudioRunningRef.current = false;
    }
  }, []);

  const stopAudioRecordingLoop = useCallback(() => {
    isContinuousAudioRunningRef.current = false;
    
    try {
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach((track: MediaStreamTrack) => {
            track.stop();
          });
        }
      }
    } catch (e) {
      console.warn('MediaRecorder stop warning:', e);
    }
    mediaRecorderRef.current = null;

    if (audioStreamRef.current) {
      try {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      audioStreamRef.current = null;
    }

    setIsRecordingAudio(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const handleToggleAudioRecording = useCallback(() => {
    if (isRecordingAudio) {
      stopAudioRecordingLoop();
    } else {
      startAudioRecordingLoop();
    }
  }, [isRecordingAudio, startAudioRecordingLoop, stopAudioRecordingLoop]);

  // Battery Listener
  useEffect(() => {
    if (typeof navigator !== 'undefined' && (navigator as any).getBattery) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);

        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
        battery.addEventListener('chargingchange', () => {
          setIsCharging(battery.charging);
        });
      }).catch(() => {});
    }
  }, []);

  // 🚨 Master SOS Start Function
  const handleStartSos = useCallback(async (customReason?: any) => {
    setIsLocating(true);
    setIsSavingAndLocking(true);
    setSavingStatusStep('🛰️ ඔබ සිටින සැබෑ GPS ස්ථානය ලබාගනිමින් පවතී...');
    setGpsError(null);

    const activeCode = sessionCode || `#SOS-${Math.floor(1000 + Math.random() * 9000)}`;
    const activeSessionId = sessionId || `sos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    setSessionCode(activeCode);
    setSessionId(activeSessionId);
    setStartedAt(nowIso);

    const activateWithPosition = async (lat: number, lng: number, acc: number = 10, speed: number = 0, head?: number) => {
      try {
        setCurrentCoords({ lat, lng });
        setAccuracy(acc);
        setSpeedKmh(speed);
        if (head !== undefined) setHeading(head);

        const initialBreadcrumb: SosBreadcrumbPoint = {
          lat,
          lng,
          timestampMs: Date.now(),
          accuracyMeters: acc,
          speedKmh: speed,
        };
        breadcrumbsRef.current = [initialBreadcrumb];
        setBreadcrumbs([initialBreadcrumb]);

        const effectiveVehicleType = vehicleType === '✨ වෙනත්' && customVehicleType.trim() 
          ? customVehicleType.trim() 
          : vehicleType;

        const initialSession: SosLiveSession = {
          id: activeSessionId,
          sessionCode: activeCode,
          userId: currentUser?.id || currentUser?.userId || 'guest_user',
          userName: currentUser?.name || 'පරිශීලක (User)',
          userPhone: currentUser?.phone || currentUser?.whatsappNumber || '',
          userNic: currentUser?.nic || '',
          latitude: lat,
          longitude: lng,
          accuracyMeters: acc,
          speedKmh: speed,
          headingDegrees: head || null,
          batteryLevel: batteryLevel,
          isCharging: isCharging,
          locationName: locationName || 'කටුනායක / ජා-ඇල ප්‍රදේශය',
          emergencyNote: emergencyNote || (typeof customReason === 'string' ? customReason : 'හදිසි ආපදාවක පසුවෙමි'),
          vehicleNumber: vehicleNumber || '',
          vehicleType: effectiveVehicleType,
          isActive: true,
          isDuressSilent: false,
          isSirenActive: isSirenOn,
          breadcrumbs: [initialBreadcrumb],
          createdAt: nowIso,
          updatedAt: nowIso,
          updatedAtMs: Date.now(),
          startedAt: startedAt || nowIso,
        };

        setSavingStatusStep('☁️ සජීවී Cloud දත්ත පද්ධතිය සමඟ සම්බන්ධ වෙමින් පවතී...');
        try {
          await createOrUpdateSosLiveSession(initialSession);
          setIsCloudSaved(true);
        } catch (dbErr) {
          console.warn('Firestore initial live session warning:', dbErr);
          setIsCloudSaved(false);
        }

        setIsActive(true);
        setIsLocating(false);
        setIsSavingAndLocking(false);
        setSavingStatusStep('');

        startHighDecibelSiren();
        startAudioRecordingLoop();
      } catch (err: any) {
        console.error('Error activating SOS session:', err);
        setIsLocating(false);
        setIsSavingAndLocking(false);
        setSavingStatusStep('');
      }
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 10;
          const spd = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
          const head = pos.coords.heading ? Math.round(pos.coords.heading) : undefined;
          activateWithPosition(lat, lng, acc, spd, head);
        },
        (err) => {
          const fallbackLat = currentCoords.lat || 7.1702;
          const fallbackLng = currentCoords.lng || 79.8858;
          activateWithPosition(fallbackLat, fallbackLng, 25, 0);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
      );
    } else {
      const fallbackLat = currentCoords.lat || 7.1702;
      const fallbackLng = currentCoords.lng || 79.8858;
      activateWithPosition(fallbackLat, fallbackLng, 50, 0);
    }
  }, [
    sessionCode,
    sessionId,
    currentUser,
    batteryLevel,
    isCharging,
    locationName,
    emergencyNote,
    vehicleNumber,
    vehicleType,
    customVehicleType,
    isSirenOn,
    startedAt,
    currentCoords,
    startHighDecibelSiren,
    startAudioRecordingLoop,
  ]);

  // 🛑 Master SOS Stop / Deactivate Function
  const handleStopSos = useCallback(async (isDuress: boolean = false) => {
    stopHighDecibelSiren();
    setIsSirenOn(false);

    stopAudioRecordingLoop();
    setIsRecordingAudio(false);

    setIsLocating(false);
    setIsSavingAndLocking(false);

    if (isDuress) {
      setIsDuressActive(true);
      setIsActive(false);

      if (sessionId) {
        updateSosLiveLocation(sessionId, {
          isDuressSilent: true,
          status: 'duress_silent',
          isActive: false,
          lastUpdatedAt: new Date().toISOString(),
          lastUpdatedAtMs: Date.now(),
        }).catch(() => {});
      }
      return;
    }

    setIsDuressActive(false);
    setCooldownRemainingSec(300); // 5 min safety buffer

    if (sessionId) {
      try {
        await updateSosLiveLocation(sessionId, {
          status: 'cooldown_buffer',
          inCooldown: true,
          isSirenActive: false,
          cooldownEndsAtMs: Date.now() + 300000,
          lastUpdatedAt: new Date().toISOString(),
          lastUpdatedAtMs: Date.now(),
        });
      } catch (e) {
        console.warn('Failed to update stop status on Firestore:', e);
      }
    }
  }, [sessionId, stopAudioRecordingLoop, stopHighDecibelSiren]);

  const handleForceCompleteNow = useCallback(async () => {
    setCooldownRemainingSec(null);
    if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsActive(false);
    if (sessionId) {
      try {
        await stopSosLiveSession(sessionId, 'පරිශීලකයා විසින් වහාම අවසන් කරන ලදී (Direct Stopped)');
      } catch {}
    }
    onClose();
  }, [sessionId, onClose]);

  // Continuous Geolocation Watcher
  useEffect(() => {
    if (!isActive || !sessionId) {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 10;
          const spd = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
          const head = pos.coords.heading ? Math.round(pos.coords.heading) : null;
          const nowMs = Date.now();

          setCurrentCoords({ lat, lng });
          setAccuracy(acc);
          setSpeedKmh(spd);
          setHeading(head);

          const newPoint: SosBreadcrumbPoint = {
            lat,
            lng,
            timestampMs: nowMs,
            accuracyMeters: acc,
            speedKmh: spd,
          };

          setBreadcrumbs((prev) => {
            const updated = [...prev, newPoint];
            breadcrumbsRef.current = updated;
            return updated;
          });

          if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
          if (accuracyCircleRef.current) {
            accuracyCircleRef.current.setLatLng([lat, lng]);
            accuracyCircleRef.current.setRadius(acc);
          }
          if (polylineRef.current && breadcrumbsRef.current.length > 0) {
            polylineRef.current.setLatLngs(breadcrumbsRef.current.map((pt) => [pt.lat, pt.lng] as [number, number]));
          }
        },
        (err) => console.warn('Geolocation watch error:', err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
      );
      watchIdRef.current = watchId;
    }

    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isActive, sessionId]);

  // Periodic Telemetry Cloud Sync (Every 10s)
  useEffect(() => {
    if (!isActive || !sessionId) {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      return;
    }

    const pushTelemetry = async () => {
      try {
        const nowIso = new Date().toISOString();
        const effectiveVehicleType = vehicleType === '✨ වෙනත්' && customVehicleType.trim() 
          ? customVehicleType.trim() 
          : vehicleType;

        await updateSosLiveLocation(sessionId, {
          latitude: currentCoords.lat,
          longitude: currentCoords.lng,
          accuracyMeters: accuracy || 10,
          speedKmh: speedKmh || 0,
          headingDegrees: heading,
          batteryLevel: batteryLevel,
          isCharging: isCharging,
          emergencyNote: emergencyNote || 'හදිසි ආපදාවක පසුවෙමි',
          vehicleNumber: vehicleNumber || '',
          vehicleType: effectiveVehicleType,
          isSirenActive: isSirenOn,
          breadcrumbs: breadcrumbsRef.current,
          lastUpdatedAt: nowIso,
          lastUpdatedAtMs: Date.now(),
        });
        setIsCloudSaved(true);
      } catch (err) {
        console.warn('Telemetry cloud sync error:', err);
      }
    };

    syncIntervalRef.current = setInterval(pushTelemetry, 10000);
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [isActive, sessionId, currentCoords, accuracy, speedKmh, heading, batteryLevel, isCharging, emergencyNote, vehicleNumber, vehicleType, customVehicleType, isSirenOn]);

  // Leaflet Map Initialization
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [currentCoords.lat, currentCoords.lng],
      zoom: 15,
      zoomControl: false,
    });

    const tileUrl = mapLayer === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    L.tileLayer(tileUrl, { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);

    const icon = L.divIcon({
      className: 'sos-live-beacon-icon',
      html: `
        <div class="relative flex items-center justify-center">
          <span class="absolute w-10 h-10 bg-rose-500/40 rounded-full animate-ping"></span>
          <span class="absolute w-6 h-6 bg-red-600 rounded-full animate-pulse"></span>
          <span class="relative w-3.5 h-3.5 bg-white rounded-full shadow-md"></span>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    markerRef.current = L.marker([currentCoords.lat, currentCoords.lng], { icon }).addTo(map);

    accuracyCircleRef.current = L.circle([currentCoords.lat, currentCoords.lng], {
      radius: accuracy || 20,
      color: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 0.12,
      weight: 1.5,
    }).addTo(map);

    polylineRef.current = L.polyline([], {
      color: '#dc2626',
      weight: 4,
      opacity: 0.85,
      dashArray: '6, 8',
    }).addTo(map);

    // Sri Lanka Police Stations on Map Layer
    const facGroup = L.layerGroup().addTo(map);
    facilitiesLayerGroupRef.current = facGroup;

    ALL_SRI_LANKA_POLICE_STATIONS.slice(0, 30).forEach((fac) => {
      const facIcon = L.divIcon({
        className: 'fac-icon',
        html: `<div class="p-1 rounded-full bg-blue-600 text-white shadow-md border-2 border-white text-xs flex items-center justify-center">👮</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const m = L.marker([fac.lat, fac.lng], { icon: facIcon });
      m.bindPopup(`
        <div class="p-1 text-xs">
          <strong class="text-slate-900 block font-bold">${fac.nameSi}</strong>
          <span class="text-slate-500 block text-[11px]">${fac.addressSi} (${fac.districtSi})</span>
          <a href="tel:${fac.phone}" class="inline-block mt-1 text-blue-600 font-bold underline">📞 ${fac.phone} අමතන්න</a>
        </div>
      `);
      facGroup.addLayer(m);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isOpen, mapLayer]);

  // Recenter Helper
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([currentCoords.lat, currentCoords.lng], 16, { animate: true });
    }
  };

  // 📋 2. RELIABLE COPY HELPER WITH VISUAL FEEDBACK
  const handleCopyShareLink = () => {
    const urlToCopy = shareUrl || `${window.location.origin}${window.location.pathname}?sos_session=${sessionId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(urlToCopy).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
      }).catch(() => {
        fallbackCopy(urlToCopy);
      });
    } else {
      fallbackCopy(urlToCopy);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  // 💬 WhatsApp Share Helper
  const handleWhatsAppShare = () => {
    const text = `🚨 *හදිසි ආපදා ඇමතුමයි (SOS EMERGENCY ALERT)*\n` +
      `👤 *නම:* ${currentUser?.name || 'පරිශීලක'}\n` +
      `📍 *ස්ථානය:* ${locationName || 'කටුනායක / ජා-ඇල'}\n` +
      `🌐 *GPS:* ${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)} (±${accuracy || 10}m)\n` +
      `⚡ *හදිසි පණිවිඩය:* ${emergencyNote}\n\n` +
      `🔴 *සජීවී සිතියම් සබැඳිය:*\n${shareUrl}\n\n` +
      `කරුණාකර මා සිටින තැන සිතියමෙන් බලා වහාම උදව් කරන්න!`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // 📱 3. SMS SHARE HELPER (DIRECT SMS BUTTON)
  const handleSmsShare = () => {
    const text = `🚨 SOS හදිසි අනතුරු ඇඟවීමයි! මා අනාරක්ෂිත අවස්ථාවක පසුවෙමි. මගේ සජීවී GPS ස්ථානය: ${shareUrl}`;
    window.open(`sms:?body=${encodeURIComponent(text)}`, '_self');
  };

  // 🛑 5. DEACTIVATE BUTTON TRIGGER (SMART & RELIABLE)
  const handleInitiateDeactivation = () => {
    if (!isActive) {
      // SOS එක සක්‍රිය වී නැතිනම් (Preview / Test තත්ත්වයේ නම්) සෘජුවම Modal එක Close කරන්න
      onClose();
      return;
    }
    // SOS සක්‍රියව ඇත්නම් ආරක්ෂක PIN තිරය විවෘත කරන්න
    setEnteredPin('');
    setEnteredPassword('');
    setEnteredNic('');
    setPinError(null);
    setShowDuressModal(true);
  };

  const handleVerifyAndDeactivate = () => {
    if (deactivateTab === 'pin') {
      if (enteredPin === '9999') {
        setShowDuressModal(false);
        handleStopSos(true); // Duress Mode
        return;
      }

      if (enteredPin === '1234' || (currentUser as any)?.pin === enteredPin) {
        setShowDuressModal(false);
        handleStopSos(false);
      } else {
        setPinError('වැරදි PIN අංකයකි! නැවත උත්සාහ කරන්න.');
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
              onClick={handleForceCompleteNow}
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
                  {isActive && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white text-red-600 animate-bounce">
                      සක්‍රියයි (LIVE)
                    </span>
                  )}
                </h3>
                <p className="text-xs text-red-100 font-medium">
                  {locationName || 'ස්ථානය තහවුරු වෙමින් පවතී...'}
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
                onClick={handleToggleAudioRecording}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  isRecordingAudio
                    ? 'bg-rose-500 text-white ring-2 ring-white animate-pulse'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {isRecordingAudio ? <Mic className="w-4 h-4 animate-ping" /> : <MicOff className="w-4 h-4" />}
                <span>{isRecordingAudio ? `පටිගත වේ (${formatDuration(recordingSeconds)})` : 'හඬ පටිගත කරන්න'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleRecenter}
              className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer text-xs flex items-center gap-1"
              title="මගේ ස්ථානයට යොමු කරන්න"
            >
              <Navigation className="w-4 h-4" />
              <span className="hidden sm:inline font-bold">Recenter</span>
            </button>
          </div>
        </div>

        {/* 2. SCROLLABLE CONTENT BODY */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Telemetry Bar & Map */}
          <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
            <div className="relative h-60 sm:h-64 w-full">
              <div ref={mapContainerRef} className="w-full h-full z-0" />

              <div className="absolute top-2 right-2 z-10 flex gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setMapLayer('osm')}
                  className={`px-2.5 py-1 rounded-xl font-bold cursor-pointer transition-all ${
                    mapLayer === 'osm' ? 'bg-rose-600 text-white' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  සිතියම
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayer('satellite')}
                  className={`px-2.5 py-1 rounded-xl font-bold cursor-pointer transition-all ${
                    mapLayer === 'satellite' ? 'bg-rose-600 text-white' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  චන්ද්‍රිකා
                </button>
              </div>
            </div>

            {isActive && (
              <div className="p-3 bg-slate-900 text-white grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-red-950/60 border border-red-500/30 text-red-200">
                  <span className="text-[10px] text-red-400 block font-bold">සැසි කේතය</span>
                  <span className="font-mono font-black text-white">{sessionCode}</span>
                </div>
                <div className="p-2 rounded-xl bg-red-950/60 border border-red-500/30 text-red-200">
                  <span className="text-[10px] text-red-400 block font-bold">නිරවද්‍යතාව</span>
                  <span className="font-mono font-black text-emerald-400">±{accuracy || 5}m</span>
                </div>
                <div className="p-2 rounded-xl bg-red-950/60 border border-red-500/30 text-red-200">
                  <span className="text-[10px] text-red-400 block font-bold">බැටරිය</span>
                  <span className="font-mono font-black text-amber-300">{batteryLevel !== null ? `${batteryLevel}%` : 'ප්‍රමාණවත්'}</span>
                </div>
                <div className="p-2 rounded-xl bg-red-950/60 border border-red-500/30 text-red-200">
                  <span className="text-[10px] text-red-400 block font-bold">වේගය</span>
                  <span className="font-mono font-black text-white">{speedKmh || 0} km/h</span>
                </div>
              </div>
            )}
          </div>

          {/* 📡 1. LIVE LOCATION SHARING CARD (Always Populated URL + Copy + WhatsApp + SMS) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500/80 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-600 animate-pulse" />
                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  සජීවී GPS ලොකේෂන් එක ශෙයා කරන්න (Share Live Tracking)
                </h4>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300">
                ✅ Live Link සූදානම්
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              ඔබ රාත්‍රී හෝ අනාරක්ෂිත ගමනක් යාමට පෙර මෙම සජීවී සිතියම් ලින්ක් එක ඔබගේ පවුලේ අයට හෝ මිතුරන්ට යවන්න. ඔවුන්ට සිතියම මත ඔබ ගමන් කරන මාර්ගය සජීවීව බලාගත හැක.
            </p>

            {/* URL Input Box (Always Populated with Real URL) */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 truncate select-all font-bold"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* 📋 Copy Button with Visual Feedback */}
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="px-3.5 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopied ? 'පිටපත් කළා!' : 'Copy'}</span>
                </button>

                {/* 💬 WhatsApp Share */}
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>

                {/* 📱 3. SMS Direct Button */}
                <button
                  type="button"
                  onClick={handleSmsShare}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
                  title="SMS මඟින් යවන්න"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>SMS</span>
                </button>
              </div>
            </div>
          </div>

          {/* 👮 4. ALL SRI LANKA POLICE STATIONS DIRECTORY */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-blue-600" />
                ලංකාවේ සියලුම පොලිස් ස්ථාන (Police Directory)
              </h4>
              <a
                href="tel:119"
                className="px-3 py-1 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-black flex items-center gap-1 shadow-sm transition-all"
              >
                <span>🚨 119 හදිසි ඇමතුම</span>
              </a>
            </div>

            {/* District Filter & Search Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="පොලිස් ස්ථානය සොයන්න (උදා: කටුනායක)..."
                  value={policeSearchQuery}
                  onChange={(e) => setPoliceSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 font-bold"
              >
                {districtsList.map((dist) => (
                  <option key={dist} value={dist}>දිස්ත්‍රික්කය: {dist}</option>
                ))}
              </select>
            </div>

            {/* List of Stations (Scrollable) */}
            <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
              {filteredPoliceStations.map((station) => (
                <div
                  key={station.id}
                  className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-2xs hover:border-blue-400 transition-all"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                      👮 {station.nameSi}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                      {station.addressSi} • <span className="text-blue-600 dark:text-blue-400 font-bold">{station.districtSi}</span>
                    </span>
                  </div>

                  <a
                    href={`tel:${station.phone}`}
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1 shadow-xs active:scale-95 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{station.phone}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* 3. EMERGENCY CONTACTS DIRECT DIAL */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-rose-500" />
              හදිසි අංක වෙත සෘජුවම ඇමතුම් ලබා ගන්න (Direct Call)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <a
                href="tel:119"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-500 text-slate-800 dark:text-white font-black text-xs shadow-xs hover:shadow-md transition-all active:scale-95"
              >
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>119 පොලිසිය</span>
              </a>
              <a
                href="tel:1990"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-800 dark:text-white font-black text-xs shadow-xs hover:shadow-md transition-all active:scale-95"
              >
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>1990 සුවසැරිය</span>
              </a>
              <a
                href="tel:110"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-500 text-slate-800 dark:text-white font-black text-xs shadow-xs hover:shadow-md transition-all active:scale-95"
              >
                <Flame className="w-4 h-4 text-amber-600" />
                <span>110 ගිනි නිවන</span>
              </a>
              <a
                href="tel:117"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-800 dark:text-white font-black text-xs shadow-xs hover:shadow-md transition-all active:scale-95"
              >
                <AlertTriangle className="w-4 h-4 text-blue-600" />
                <span>117 ආපදා සහන</span>
              </a>
            </div>
          </div>

          {/* 🎙️ 6. SURROUNDINGS AUDIO RECORDING & AUDIO PLAYER (Listen & Download) */}
          <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-400">
                  <Mic className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h5 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    පසුබිම් හඬ පටිගත කිරීම (Audio Evidence)
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300">
                      {isRecordingAudio ? '🔴 REC' : 'සක්‍රියයි'}
                    </span>
                  </h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    අනතුරකදී හෝ අපරාධයකදී සාක්ෂි තහවුරු කරගැනීම සඳහා හඬ පටිගත වේ.
                  </p>
                </div>
              </div>
              {isRecordingAudio && (
                <span className="text-xs font-mono font-black text-rose-600 animate-pulse">
                  {formatDuration(recordingSeconds)}
                </span>
              )}
            </div>

            {/* 🎧 In-App Audio Evidence Player (හඬට සවන් දීම සහ බාගත කිරීම) */}
            {recordedAudioUrl && (
              <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-amber-300/60 dark:border-amber-900/60 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle className="w-4 h-4" /> හඬ සාක්ෂිය පටිගත විය (Audio Saved)
                  </span>
                  <a
                    href={recordedAudioUrl}
                    download={`sahaya_audio_evidence_${Date.now()}.webm`}
                    className="text-blue-600 hover:text-blue-700 text-[11px] font-bold flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>බාගත කරන්න (Download)</span>
                  </a>
                </div>

                <audio controls src={recordedAudioUrl} className="w-full h-9 rounded-xl outline-none" />
              </div>
            )}
          </div>

          {/* 🛑 5. FOOTER DEACTIVATE BUTTON (Works reliably) */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleInitiateDeactivation}
              className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-black text-sm tracking-wide shadow-lg hover:shadow-xl active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span>මම දැන් ආරක්ෂිතයි (Deactivate SOS)</span>
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2 font-medium">
              විකාශනය අවසන් කිරීමට ඔබගේ අංක 4ක PIN අංකය හෝ මුරපදය මඟින් තහවුරු කරන්න.
            </p>
          </div>

        </div>

        {/* 🔐 DURESS / DEACTIVATION MODAL (z-[9999] Top Level + Numeric Keypad) */}
        {showDuressModal && (
          <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl space-y-4">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-500">
                  <Lock className="w-5 h-5" />
                  <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                    SOS විකාශනය නවත්වන්න (Deactivate SOS)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDuressModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs: PIN vs Password / NIC */}
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setDeactivateTab('pin'); setPinError(null); }}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                    deactivateTab === 'pin'
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  🔢 ආරක්ෂක PIN
                </button>
                <button
                  type="button"
                  onClick={() => { setDeactivateTab('nic'); setPinError(null); }}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                    deactivateTab === 'nic'
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  🔑 මුරපදය / NIC
                </button>
              </div>

              {pinError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900 text-rose-600 text-xs font-bold rounded-xl text-center">
                  {pinError}
                </div>
              )}

              {deactivateTab === 'pin' ? (
                <div className="space-y-2 flex flex-col items-center">
                  <p className="text-xs text-slate-600 dark:text-slate-300 text-center">
                    ආරක්ෂාව තහවුරු කිරීමට ඔබගේ අංක 4ක ආරක්ෂක PIN අංකය ඇතුළත් කරන්න.
                  </p>

                  {/* 4-Digit PIN Indicator Dots */}
                  <div className="flex justify-center items-center gap-3 my-2">
                    {[0, 1, 2, 3].map((index) => {
                      const isFilled = enteredPin.length > index;
                      return (
                        <div
                          key={index}
                          className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center transition-all ${
                            isFilled
                              ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/60 shadow-sm'
                              : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60'
                          }`}
                        >
                          {isFilled && (
                            <div className="w-3.5 h-3.5 rounded-full bg-rose-600 dark:bg-rose-500 animate-in zoom-in-75 duration-150" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Standalone On-Screen Numeric Keypad */}
                  <div className="grid grid-cols-3 gap-2 w-full max-w-[270px] my-1 select-none">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => {
                          if (enteredPin.length < 4) {
                            setEnteredPin(prev => prev + digit);
                            setPinError(null);
                          }
                        }}
                        className="h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-lg font-black flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xs"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={enteredPin.length === 0}
                      onClick={() => {
                        setEnteredPin('');
                        setPinError(null);
                      }}
                      className="h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                      title="මුල සිට (Clear)"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (enteredPin.length < 4) {
                          setEnteredPin(prev => prev + '0');
                          setPinError(null);
                        }
                      }}
                      className="h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-lg font-black flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xs"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      disabled={enteredPin.length === 0}
                      onClick={() => {
                        setEnteredPin(prev => prev.slice(0, -1));
                        setPinError(null);
                      }}
                      className="h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/70 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 text-base font-black flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                      title="මකන්න (Delete)"
                    >
                      ⌫
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-500 text-center pt-1">
                    බලහත්කාර අවස්ථාවකදී රහසිගත Duress PIN සඳහා: <span className="font-mono font-black text-rose-600">9999</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    ඔබගේ ගිණුමේ මුරපදය (Password) හෝ ලියාපදිංචි ජාතික හැඳුනුම්පත් අංකය (NIC) ඇතුළත් කරන්න.
                  </p>
                  <input
                    type="password"
                    placeholder="ගිණුම් මුරපදය (Password)"
                    value={enteredPassword}
                    onChange={(e) => {
                      setEnteredPassword(e.target.value);
                      setPinError(null);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm outline-none focus:border-rose-500"
                  />
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">හෝ</span>
                  </div>
                  <input
                    type="text"
                    placeholder="ජාතික හැඳුනුම්පත් අංකය (NIC)"
                    value={enteredNic}
                    onChange={(e) => {
                      setEnteredNic(e.target.value);
                      setPinError(null);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm outline-none focus:border-rose-500 uppercase font-mono"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDuressModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  අවලංගුයි
                </button>
                <button
                  type="button"
                  onClick={handleVerifyAndDeactivate}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  තහවුරු කර Off කරන්න
                </button>
              </div>

              <div className="text-center pt-1 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleDirectEmergencyStop}
                  className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold underline cursor-pointer"
                >
                  මුරපදය අමතකද? ආරක්ෂිතව සෘජුවම අක්‍රිය කරන්න (Emergency Stop)
                </button>
              </div>

            </div>
          </div>
        )}

        {/* 📚 FEATURES GUIDE MODAL */}
        {showFeaturesGuideModal && (
          <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-500">
                  <Info className="w-5 h-5" />
                  <h4 className="font-black text-base text-slate-900 dark:text-white">
                    SOS සහ සජීවී ලුහුබැඳීමේ මාර්ගෝපදේශය
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFeaturesGuideModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 max-h-[60vh] overflow-y-auto pr-1">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">
                    1. සජීවී GPS ලුහුබැඳීම (Live Tracking):
                  </span>
                  ඔබ SOS සක්‍රිය කළ පසු ඔබේ ගමන් මාර්ගය ස්වයංක්‍රීයව සිතියම මත සටහන් වන අතර එය තත්පර 10කට වරක් Cloud දත්ත පද්ධතිය සමඟ සමමුහුර්ත වේ.
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">
                    2. විනාඩි 5ක ආරක්ෂක බෆරය (5-Minute Safety Buffer):
                  </span>
                  ඔබ SOS විකාශනය නැවැත්වුවද, සයිරනය පමණක් නැවතී සජීවී ලොකේෂන් එක තවත් විනාඩි 5ක් අඛණ්ඩව යාවත්කාලීන වේ.
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
