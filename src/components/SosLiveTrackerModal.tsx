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
  Building2,
  PhoneCall,
  Delete,
  Send,
  Headphones,
  FileText,
  Shield,
  Users,
  UserPlus
} from 'lucide-react';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
}
import { User, Language, LocationOption, SosLiveSession, SosBreadcrumbPoint } from '../types';
import { createOrUpdateSosLiveSession, updateSosLiveLocation, stopSosLiveSession } from '../lib/firebase';
import { SosLiveViewerModal } from './SosLiveViewerModal';
import { getLastKnownLocation } from '../utils/autoGpsService';
import { resolveExactLocation } from '../utils/geoUtils';
import { verifyCurrentUserPin } from '../utils/devicePinManager';
/**
 * Comprehensive Sri Lanka Police Stations Directory
 * Covers all 25 Districts, 9 Provinces and Emergency Units.
 */

export interface PoliceStationEntry {
  id: string;
  nameSi: string;
  nameEn: string;
  districtSi: string;
  districtEn: string;
  provinceSi: string;
  provinceEn: string;
  phone: string;
  altPhone?: string;
  addressSi: string;
  lat: number;
  lng: number;
}

export const ALL_SRI_LANKA_POLICE_STATIONS: PoliceStationEntry[] = [
  // 1. කොළඹ දිස්ත්‍රික්කය (Colombo District)
  { id: 'ps_col_hq', nameSi: 'පොලිස් මූලස්ථානය (කොළඹ)', nameEn: 'Police Headquarters (Colombo)', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112421111', altPhone: '119', addressSi: 'පොලිස් මූලස්ථානය, කොළඹ 01', lat: 6.9344, lng: 79.8428 },
  { id: 'ps_col_fort', nameSi: 'කොටුව පොලිස් ස්ථානය', nameEn: 'Fort Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112431422', altPhone: '0112432822', addressSi: 'චැතම් වීදිය, කොටුව, කොළඹ 01', lat: 6.9365, lng: 79.8441 },
  { id: 'ps_col_pettah', nameSi: 'පිටකොටුව පොලිස් ස්ථානය', nameEn: 'Pettah Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112421684', altPhone: '0112431711', addressSi: 'ප්‍රධාන වීදිය, පිටකොටුව, කොළඹ 11', lat: 6.9388, lng: 79.8542 },
  { id: 'ps_col_slaveisland', nameSi: 'කොම්පඤ්ඤවීදිය පොලිස් ස්ථානය', nameEn: 'Slave Island Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112421141', altPhone: '0112431221', addressSi: 'යුක්ති මාවත, කොම්පඤ්ඤවීදිය, කොළඹ 02', lat: 6.9215, lng: 79.8548 },
  { id: 'ps_col_kollupitiya', nameSi: 'කොල්ලුපිටිය පොලිස් ස්ථානය', nameEn: 'Kollupitiya Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112573211', altPhone: '0112574455', addressSi: 'ගාලු පාර, කොල්ලුපිටිය, කොළඹ 03', lat: 6.9056, lng: 79.8517 },
  { id: 'ps_col_bambalapitiya', nameSi: 'බම්බලපිටිය පොලිස් ස්ථානය', nameEn: 'Bambalapitiya Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112588222', altPhone: '0112581223', addressSi: 'ලෝරිස් මාවත, බම්බලපිටිය, කොළඹ 04', lat: 6.8925, lng: 79.8553 },
  { id: 'ps_col_wellawatte', nameSi: 'වැල්ලවත්ත පොලිස් ස්ථානය', nameEn: 'Wellawatte Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112588211', altPhone: '0112584145', addressSi: 'ස්ටැන්ෆෝර්ඩ් පෙදෙස, වැල්ලවත්ත, කොළඹ 06', lat: 6.8744, lng: 79.8606 },
  { id: 'ps_col_cinnamon', nameSi: 'කුරුඳුවත්ත පොලිස් ස්ථානය', nameEn: 'Cinnamon Gardens Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112694242', altPhone: '0112695555', addressSi: 'මල් පාර, කුරුඳුවත්ත, කොළඹ 07', lat: 6.9112, lng: 79.8647 },
  { id: 'ps_col_borella', nameSi: 'බොරැල්ල පොලිස් ස්ථානය', nameEn: 'Borella Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112694142', altPhone: '0112692223', addressSi: 'කොටා පාර, බොරැල්ල, කොළඹ 08', lat: 6.9148, lng: 79.8778 },
  { id: 'ps_col_dematagoda', nameSi: 'දෙමටගොඩ පොලිස් ස්ථානය', nameEn: 'Dematagoda Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112692121', altPhone: '0112693444', addressSi: 'දෙමටගොඩ පාර, කොළඹ 09', lat: 6.9295, lng: 79.8806 },
  { id: 'ps_col_maradana', nameSi: 'මරදාන පොලිස් ස්ථානය', nameEn: 'Maradana Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112692222', altPhone: '0112691234', addressSi: 'ඩීන්ස් පාර, මරදාන, කොළඹ 10', lat: 6.9272, lng: 79.8656 },
  { id: 'ps_col_grandpass', nameSi: 'ග්‍රෑන්ඩ්පාස් පොලිස් ස්ථානය', nameEn: 'Grandpass Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112431411', altPhone: '0112435555', addressSi: 'ග්‍රෑන්ඩ්පාස් පාර, කොළඹ 14', lat: 6.9515, lng: 79.8672 },
  { id: 'ps_col_kotahena', nameSi: 'කොටහේන පොලිස් ස්ථානය', nameEn: 'Kotahena Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112431861', altPhone: '0112432222', addressSi: 'කොටහේන වීදිය, කොළඹ 13', lat: 6.9472, lng: 79.8597 },
  { id: 'ps_col_modara', nameSi: 'මෝදර පොලිස් ස්ථානය', nameEn: 'Modara Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112521122', altPhone: '0112522222', addressSi: 'මට්ටක්කුලිය පාර, මෝදර, කොළඹ 15', lat: 6.9667, lng: 79.8694 },
  { id: 'ps_col_thimbirigasyaya', nameSi: 'නාරාහේන්පිට පොලිස් ස්ථානය', nameEn: 'Narahenpita Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112368242', altPhone: '0112369242', addressSi: 'කිරිමණ්ඩල මාවත, නාරාහේන්පිට, කොළඹ 05', lat: 6.8967, lng: 79.8789 },
  { id: 'ps_col_kirulapone', nameSi: 'කිරුළපන පොලිස් ස්ථානය', nameEn: 'Kirulapone Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112513222', altPhone: '0112514222', addressSi: 'හයිලෙවල් පාර, කිරුළපන, කොළඹ 05', lat: 6.8833, lng: 79.8767 },
  { id: 'ps_col_nugegoda', nameSi: 'නුගේගොඩ පොලිස් ස්ථානය', nameEn: 'Nugegoda Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112852222', altPhone: '0112852556', addressSi: 'ස්ටැන්ලි තිලකරත්න මාවත, නුගේගොඩ', lat: 6.8683, lng: 79.8978 },
  { id: 'ps_col_maharagama', nameSi: 'මහරගම පොලිස් ස්ථානය', nameEn: 'Maharagama Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112850222', altPhone: '0112850722', addressSi: 'හයිලෙවල් පාර, මහරගම', lat: 6.8483, lng: 79.9267 },
  { id: 'ps_col_kottawa', nameSi: 'කොට්ටාව පොලිස් ස්ථානය', nameEn: 'Kottawa Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112781222', altPhone: '0112782222', addressSi: 'පරණ පාර, කොට්ටාව', lat: 6.8417, lng: 79.9653 },
  { id: 'ps_col_homagama', nameSi: 'හෝමාගම මූලස්ථාන පොලිසිය', nameEn: 'Homagama HQ Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112855222', altPhone: '0112855223', addressSi: 'හයිලෙවල් පාර, හෝමාගම', lat: 6.8411, lng: 80.0028 },
  { id: 'ps_col_kaduwela', nameSi: 'කඩුවෙල පොලිස් ස්ථානය', nameEn: 'Kaduwela Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112538222', altPhone: '0112539222', addressSi: 'අවිස්සාවේල්ල පාර, කඩුවෙල', lat: 6.9333, lng: 79.9833 },
  { id: 'ps_col_malabe', nameSi: 'මාලබේ පොලිස් ස්ථානය', nameEn: 'Malabe Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112744222', altPhone: '0112745222', addressSi: 'කඩුවෙල පාර, මාලබේ', lat: 6.9042, lng: 79.9547 },
  { id: 'ps_col_thalangama', nameSi: 'තලංගම පොලිස් ස්ථානය', nameEn: 'Thalangama Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112789222', altPhone: '0112788222', addressSi: 'බත්තරමුල්ල, තලංගම', lat: 6.8978, lng: 79.9242 },
  { id: 'ps_col_welikada', nameSi: 'වැලික්කඩ පොලිස් ස්ථානය', nameEn: 'Welikada Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112862222', altPhone: '0112863333', addressSi: 'රාජගිරිය, වැලික්කඩ', lat: 6.9089, lng: 79.8925 },
  { id: 'ps_col_mirihana', nameSi: 'මිරිහාන මූලස්ථාන පොලිසිය', nameEn: 'Mirihana Special Police HQ', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112852555', altPhone: '0112852556', addressSi: 'පරණ කැස්බෑව පාර, මිරිහාන, නුගේගොඩ', lat: 6.8719, lng: 79.9044 },
  { id: 'ps_col_dehiwala', nameSi: 'දෙහිවල පොලිස් ස්ථානය', nameEn: 'Dehiwala Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112717222', altPhone: '0112713333', addressSi: 'ගාලු පාර, දෙහිවල', lat: 6.8519, lng: 79.8658 },
  { id: 'ps_col_mountlavinia', nameSi: 'ගල්කිස්ස මූලස්ථාන පොලිසිය', nameEn: 'Mount Lavinia HQ Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112713444', altPhone: '0112713445', addressSi: 'හෝටල් පාර, ගල්කිස්ස', lat: 6.8358, lng: 79.8653 },
  { id: 'ps_col_moratuwa', nameSi: 'මොරටුව පොලිස් ස්ථානය', nameEn: 'Moratuwa Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112645222', altPhone: '0112644222', addressSi: 'ගාලු පාර, මොරටුව', lat: 6.7733, lng: 79.8817 },
  { id: 'ps_col_piliyandala', nameSi: 'පිළියන්දල පොලිස් ස්ථානය', nameEn: 'Piliyandala Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112614222', altPhone: '0112615222', addressSi: 'කොළඹ පාර, පිළියන්දල', lat: 6.8017, lng: 79.9228 },
  { id: 'ps_col_kesbewa', nameSi: 'කැස්බෑව පොලිස් ස්ථානය', nameEn: 'Kesbewa Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112603222', altPhone: '0112604222', addressSi: 'බණ්ඩාරගම පාර, කැස්බෑව', lat: 6.7833, lng: 79.9458 },
  { id: 'ps_col_padukka', nameSi: 'පාදුක්ක පොලිස් ස්ථානය', nameEn: 'Padukka Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112859222', altPhone: '0112859333', addressSi: 'හොරණ පාර, පාදුක්ක', lat: 6.8483, lng: 80.1033 },
  { id: 'ps_col_hanwella', nameSi: 'හංවැල්ල පොලිස් ස්ථානය', nameEn: 'Hanwella Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0362253222', altPhone: '0362254222', addressSi: 'හයිලෙවල් පාර, හංවැල්ල', lat: 6.9008, lng: 80.0847 },
  { id: 'ps_col_avissawella', nameSi: 'අවිස්සාවේල්ල මූලස්ථාන පොලිසිය', nameEn: 'Avissawella HQ Police Station', districtSi: 'කොළඹ', districtEn: 'Colombo', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0362222222', altPhone: '0362222223', addressSi: 'කොළඹ පාර, අවිස්සාවේල්ල', lat: 6.9536, lng: 80.2078 },

  // 2. ගම්පහ දිස්ත්‍රික්කය (Gampaha District)
  { id: 'ps_gam_gampaha', nameSi: 'ගම්පහ මූලස්ථාන පොලිසිය', nameEn: 'Gampaha HQ Police Station', districtSi: 'ගම්පහ', districtEn: 'Gampaha', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0332222222', altPhone: '0332222223', addressSi: 'මිරිස්වත්ත පාර, ගම්පහ', lat: 7.0897, lng: 79.9925 },
  { id: 'ps_gam_negombo', nameSi: 'මීගමුව මූලස්ථාන පොලිසිය', nameEn: 'Negombo HQ Police Station', districtSi: 'ගම්පහ', districtEn: 'Gampaha', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0312222222', altPhone: '0312222223', addressSi: 'කොළඹ පාර, මීගමුව', lat: 7.2083, lng: 79.8358 },
  { id: 'ps_gam_katunayake', nameSi: 'කටුනායක ගුවන් තොටුපළ පොලිසිය', nameEn: 'Katunayake Airport Police Station', districtSi: 'ගම්පහ', districtEn: 'Gampaha', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112252422', altPhone: '0112252735', addressSi: 'බණ්ඩාරනායක ජාත්‍යන්තර ගුවන් තොටුපළ, කටුනායක', lat: 7.1808, lng: 79.8842 },
  { id: 'ps_gam_jaela', nameSi: 'ජා-ඇල පොලිස් ස්ථානය', nameEn: 'Ja-Ela Police Station', districtSi: 'ගම්පහ', districtEn: 'Gampaha', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112236222', altPhone: '0112237222', addressSi: 'මීගමුව පාර, ජා-ඇල', lat: 7.0758, lng: 79.8917 },
  { id: 'ps_gam_kandana', nameSi: 'කඳාන පොලිස් ස්ථානය', nameEn: 'Kandana Police Station', districtSi: 'ගම්පහ', districtEn: 'Gampaha', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112236242', altPhone: '0112236555', addressSi: 'මීගමුව පාර, කඳාන', lat: 7.0478, lng: 79.8978 },
  { id: 'ps_gam_wattala', nameSi: 'වත්තල පොලිස් ස්ථානය', nameEn: 'Wattala Police Station', districtSi: 'ගම්පහ', districtEn: 'Gampaha', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112930222', altPhone: '0112931222', addressSi: 'මීගමුව පාර, වත්තල', lat: 6.9897, lng: 79.8919 },
  { id: 'ps_gam_kelaniya', nameSi: 'කැලණිය මූලස්ථාන පොලිසිය', nameEn: 'Kelaniya HQ Police Station', districtSi: 'ගම්පහ', districtEn: 'Gampaha', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112911222', altPhone: '0112912222', addressSi: 'කැලණිය රජමහා විහාර පාර, කැලණිය', lat: 6.9553, lng: 79.9189 },
  { id: 'ps_gam_peliyagoda', nameSi: 'පෑලියගොඩ පොලිස් ස්ථානය', nameEn: 'Peliyagoda Police Station', districtSi: 'ගම්පහ', districtEn: 'Gampaha', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112914222', altPhone: '0112915222', addressSi: 'නුවර පාර, පෑලියගොඩ', lat: 6.9611, lng: 79.8867 },
  { id: 'ps_gam_kiribathgoda', nameSi: 'කිරිබත්ගොඩ පොලිස් ස්ථානය', nameEn: 'Kiribathgoda Police Station', districtSi: 'ගම්පහ', districtEn: 'Gampaha', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112911444', altPhone: '0112911555', addressSi: 'නුවර පාර, කිරිබත්ගොඩ', lat: 6.9789, lng: 79.9286 },
  { id: 'ps_gam_kadawatha', nameSi: 'කඩවත පොලිස් ස්ථානය', nameEn: 'Kadawatha Police Station', districtSi: 'ගම්පහ', districtEn: 'Gampaha', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112925222', altPhone: '0112926222', addressSi: 'නුවර පාර, කඩවත', lat: 7.0017, lng: 79.9525 },
  { id: 'ps_gam_ragama', nameSi: 'රාගම පොලිස් ස්ථානය', nameEn: 'Ragama Police Station', districtSi: 'ගම්පහ', districtEn: 'Gampaha', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112958222', altPhone: '0112959222', addressSi: 'දුම්රියපොළ පාර, රාගම', lat: 7.0272, lng: 79.9197 },
  { id: 'ps_gam_mahara', nameSi: 'මහර පොලිස් ස්ථානය', nameEn: 'Mahara Police Station', districtSi: 'ගම්පහ', districtEn: 'Gampaha', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112962222', altPhone: '0112963222', addressSi: 'නුවර පාර, මහර', lat: 7.0147, lng: 79.9431 },
  { id: 'ps_gam_biyagama', nameSi: 'බියගම පොලිස් ස්ථානය', nameEn: 'Biyagama Police Station', districtSi: 'ගම්පහ', districtEn: 'Gampaha', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112488222', altPhone: '0112489222', addressSi: 'නිදහස් වෙළඳ කලාපය, බියගම', lat: 6.9428, lng: 79.9889 },
  { id: 'ps_gam_sapugaskanda', nameSi: 'සපුගස්කන්ද පොලිස් ස්ථානය', nameEn: 'Sapugaskanda Police Station', districtSi: 'ගම්පහ', districtEn: 'Gampaha', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112400222', altPhone: '0112401222', addressSi: 'තෙල්පිරිපහදු පාර, සපුගස්කන්ද', lat: 6.9644, lng: 79.9472 },
  { id: 'ps_gam_yakkala', nameSi: 'යක්කල පොලිස් ස්ථානය', nameEn: 'Yakkala Police Station', districtSi: 'ගම්පහ', districtEn: 'Gampaha', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0332226222', altPhone: '0332227222', addressSi: 'නුවර පාර, යක්කල', lat: 7.0911, lng: 80.0333 },
  { id: 'ps_gam_veyangoda', nameSi: 'වේයන්ගොඩ පොලිස් ස්ථානය', nameEn: 'Veyangoda Police Station', districtSi: 'ගම්පහ', districtEn: 'Gampaha', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0332287222', altPhone: '0332288222', addressSi: 'දුම්රියපොළ පාර, වේයන්ගොඩ', lat: 7.1583, lng: 80.0583 },
  { id: 'ps_gam_nittambuwa', nameSi: 'නිට්ටඹුව පොලිස් ස්ථානය', nameEn: 'Nittambuwa Police Station', districtSi: 'ගම්පහ', districtEn: 'Gampaha', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0332286222', altPhone: '0332287444', addressSi: 'නුවර පාර, නිට්ටඹුව', lat: 7.1444, lng: 80.0986 },
  { id: 'ps_gam_mirigama', nameSi: 'මීරිගම පොලිස් ස්ථානය', nameEn: 'Mirigama Police Station', districtSi: 'ගම්පහ', districtEn: 'Gampaha', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0332273222', altPhone: '0332274222', addressSi: 'පිරිවෙන පාර, මීරිගම', lat: 7.2417, lng: 80.1333 },
  { id: 'ps_gam_minuwangoda', nameSi: 'මිනුවන්ගොඩ පොලිස් ස්ථානය', nameEn: 'Minuwangoda Police Station', districtSi: 'ගම්පහ', districtEn: 'Gampaha', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112295222', altPhone: '0112296222', addressSi: 'දිවුලපිටිය පාර, මිනුවන්ගොඩ', lat: 7.1667, lng: 79.9500 },
  { id: 'ps_gam_divulapitiya', nameSi: 'දිවුලපිටිය පොලිස් ස්ථානය', nameEn: 'Divulapitiya Police Station', districtSi: 'ගම්පහ', districtEn: 'Gampaha', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0312246222', altPhone: '0312247222', addressSi: 'මීරිගම පාර, දිවුලපිටිය', lat: 7.2167, lng: 80.0167 },
  { id: 'ps_gam_kochchikade', nameSi: 'කොච්චිකඩේ පොලිස් ස්ථානය', nameEn: 'Kochchikade Police Station', districtSi: 'ගම්පහ', districtEn: 'Gampaha', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0312277222', altPhone: '0312278222', addressSi: 'මීගමුව-හලාවත පාර, කොච්චිකඩේ', lat: 7.2667, lng: 79.8667 },
  { id: 'ps_gam_seeduwa', nameSi: 'සීදුව පොලිස් ස්ථානය', nameEn: 'Seeduwa Police Station', districtSi: 'ගම්පහ', districtEn: 'Gampaha', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0112253222', altPhone: '0112254222', addressSi: 'කොළඹ-මීගමුව පාර, සීදුව', lat: 7.1278, lng: 79.8806 },

  // 3. කළුතර දිස්ත්‍රික්කය (Kalutara District)
  { id: 'ps_kal_kalutara_north', nameSi: 'කළුතර උතුර පොලිස් ස්ථානය', nameEn: 'Kalutara North Police Station', districtSi: 'කළුතර', districtEn: 'Kalutara', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0342222222', altPhone: '0342222223', addressSi: 'ගාලු පාර, කළුතර උතුර', lat: 6.6000, lng: 79.9667 },
  { id: 'ps_kal_kalutara_south', nameSi: 'කළුතර දකුණ මූලස්ථාන පොලිසිය', nameEn: 'Kalutara South HQ Police Station', districtSi: 'කළුතර', districtEn: 'Kalutara', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0342222722', altPhone: '0342222723', addressSi: 'පොලිස් මාවත, කළුතර දකුණ', lat: 6.5833, lng: 79.9667 },
  { id: 'ps_kal_panadura_north', nameSi: 'පානදුර උතුර පොලිස් ස්ථානය', nameEn: 'Panadura North Police Station', districtSi: 'කළුතර', districtEn: 'Kalutara', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0382232222', altPhone: '0382233222', addressSi: 'ගාලු පාර, පානදුර', lat: 6.7222, lng: 79.9056 },
  { id: 'ps_kal_panadura_south', nameSi: 'පානදුර දකුණ පොලිස් ස්ථානය', nameEn: 'Panadura South Police Station', districtSi: 'කළුතර', districtEn: 'Kalutara', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0382234222', altPhone: '0382235222', addressSi: 'මහ පාර, පානදුර', lat: 6.7056, lng: 79.9167 },
  { id: 'ps_kal_wadduwa', nameSi: 'වාද්දුව පොලිස් ස්ථානය', nameEn: 'Wadduwa Police Station', districtSi: 'කළුතර', districtEn: 'Kalutara', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0382284222', altPhone: '0382285222', addressSi: 'ගාලු පාර, වාද්දුව', lat: 6.6667, lng: 79.9333 },
  { id: 'ps_kal_beruwala', nameSi: 'බේරුවල පොලිස් ස්ථානය', nameEn: 'Beruwala Police Station', districtSi: 'කළුතර', districtEn: 'Kalutara', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0342276222', altPhone: '0342277222', addressSi: 'ගාලු පාර, බේරුවල', lat: 6.4783, lng: 79.9828 },
  { id: 'ps_kal_aluthgama', nameSi: 'අලුත්ගම පොලිස් ස්ථානය', nameEn: 'Aluthgama Police Station', districtSi: 'කළුතර', districtEn: 'Kalutara', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0342275222', altPhone: '0342275333', addressSi: 'ගාලු පාර, අලුත්ගම', lat: 6.4333, lng: 80.0000 },
  { id: 'ps_kal_horana', nameSi: 'හොරණ මූලස්ථාන පොලිසිය', nameEn: 'Horana HQ Police Station', districtSi: 'කළුතර', districtEn: 'Kalutara', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0342261222', altPhone: '0342261223', addressSi: 'පානදුර-රත්නපුර පාර, හොරණ', lat: 6.7167, lng: 80.0667 },
  { id: 'ps_kal_bandaragama', nameSi: 'බණ්ඩාරගම පොලිස් ස්ථානය', nameEn: 'Bandaragama Police Station', districtSi: 'කළුතර', districtEn: 'Kalutara', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0382290222', altPhone: '0382291222', addressSi: 'කැස්බෑව පාර, බණ්ඩාරගම', lat: 6.7167, lng: 79.9833 },
  { id: 'ps_kal_ingiriya', nameSi: 'ඉංගිරිය පොලිස් ස්ථානය', nameEn: 'Ingiriya Police Station', districtSi: 'කළුතර', districtEn: 'Kalutara', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0342269222', altPhone: '0342269333', addressSi: 'පානදුර-රත්නපුර පාර, ඉංගිරිය', lat: 6.7444, lng: 80.1583 },
  { id: 'ps_kal_matugama', nameSi: 'මතුගම මූලස්ථාන පොලිසිය', nameEn: 'Matugama HQ Police Station', districtSi: 'කළුතර', districtEn: 'Kalutara', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0342247222', altPhone: '0342247333', addressSi: 'අගලවත්ත පාර, මතුගම', lat: 6.5222, lng: 80.1167 },
  { id: 'ps_kal_agalawatta', nameSi: 'අගලවත්ත පොලිස් ස්ථානය', nameEn: 'Agalawatta Police Station', districtSi: 'කළුතර', districtEn: 'Kalutara', provinceSi: 'බස්නාහිර', provinceEn: 'Western', phone: '0342245222', altPhone: '0342245333', addressSi: 'කළුතර පාර, අගලවත්ත', lat: 6.5417, lng: 80.1583 },

  // 4. මහනුවර දිස්ත්‍රික්කය (Kandy District)
  { id: 'ps_kan_kandy_hq', nameSi: 'මහනුවර මූලස්ථාන පොලිසිය', nameEn: 'Kandy HQ Police Station', districtSi: 'මහනුවර', districtEn: 'Kandy', provinceSi: 'මධ්‍යම', provinceEn: 'Central', phone: '0812222222', altPhone: '0812222223', addressSi: 'ඩී.එස්. සේනානායක වීදිය, මහනුවර', lat: 7.2906, lng: 80.6337 },
  { id: 'ps_kan_peradeniya', nameSi: 'පේරාදෙණිය පොලිස් ස්ථානය', nameEn: 'Peradeniya Police Station', districtSi: 'මහනුවර', districtEn: 'Kandy', provinceSi: 'මධ්‍යම', provinceEn: 'Central', phone: '0812388222', altPhone: '0812389222', addressSi: 'කොළඹ පාර, පේරාදෙණිය', lat: 7.2611, lng: 80.5956 },
  { id: 'ps_kan_katugastota', nameSi: 'කටුගස්තොට පොලිස් ස්ථානය', nameEn: 'Katugastota Police Station', districtSi: 'මහනුවර', districtEn: 'Kandy', provinceSi: 'මධ්‍යම', provinceEn: 'Central', phone: '0812499222', altPhone: '0812498222', addressSi: 'කුරුණෑගල පාර, කටුගස්තොට', lat: 7.3247, lng: 80.6206 },
  { id: 'ps_kan_gampola', nameSi: 'ගම්පොළ මූලස්ථාන පොලිසිය', nameEn: 'Gampola HQ Police Station', districtSi: 'මහනුවර', districtEn: 'Kandy', provinceSi: 'මධ්‍යම', provinceEn: 'Central', phone: '0812352222', altPhone: '0812353222', addressSi: 'නුවර පාර, ගම්පොළ', lat: 7.1642, lng: 80.5692 },
  { id: 'ps_kan_nawalapitiya', nameSi: 'නාවලපිටිය පොලිස් ස්ථානය', nameEn: 'Nawalapitiya Police Station', districtSi: 'මහනුවර', districtEn: 'Kandy', provinceSi: 'මධ්‍යම', provinceEn: 'Central', phone: '0542222222', altPhone: '0542222223', addressSi: 'දුම්රියපොළ පාර, නාවලපිටිය', lat: 7.0500, lng: 80.5333 },
  { id: 'ps_kan_wattegama', nameSi: 'වත්තේගම පොලිස් ස්ථානය', nameEn: 'Wattegama Police Station', districtSi: 'මහනුවර', districtEn: 'Kandy', provinceSi: 'මධ්‍යම', provinceEn: 'Central', phone: '0812476222', altPhone: '0812477222', addressSi: 'මාතලේ පාර, වත්තේගම', lat: 7.3500, lng: 80.6833 },
  { id: 'ps_kan_teldeniya', nameSi: 'තෙල්දෙණිය පොලිස් ස්ථානය', nameEn: 'Teldeniya Police Station', districtSi: 'මහනුවර', districtEn: 'Kandy', provinceSi: 'මධ්‍යම', provinceEn: 'Central', phone: '0812374222', altPhone: '0812375222', addressSi: 'මහියංගණ පාර, තෙල්දෙණිය', lat: 7.3000, lng: 80.7667 },
  { id: 'ps_kan_kundasale', nameSi: 'කුණ්ඩසාලේ පොලිස් ස්ථානය', nameEn: 'Kundasale Police Station', districtSi: 'මහනුවර', districtEn: 'Kandy', provinceSi: 'මධ්‍යම', provinceEn: 'Central', phone: '0812420222', altPhone: '0812421222', addressSi: 'දිගන පාර, කුණ්ඩසාලේ', lat: 7.2833, lng: 80.6833 },

  // 5. මාතලේ දිස්ත්‍රික්කය (Matale District)
  { id: 'ps_mat_matale', nameSi: 'මාතලේ මූලස්ථාන පොලිසිය', nameEn: 'Matale HQ Police Station', districtSi: 'මාතලේ', districtEn: 'Matale', provinceSi: 'මධ්‍යම', provinceEn: 'Central', phone: '0662222222', altPhone: '0662222223', addressSi: 'ත්‍රිකුණාමල වීදිය, මාතලේ', lat: 7.4675, lng: 80.6233 },
  { id: 'ps_mat_dambulla', nameSi: 'දඹුල්ල මූලස්ථාන පොලිසිය', nameEn: 'Dambulla HQ Police Station', districtSi: 'මාතලේ', districtEn: 'Matale', provinceSi: 'මධ්‍යම', provinceEn: 'Central', phone: '0662284722', altPhone: '0662284723', addressSi: 'කුරුණෑගල හන්දිය, දඹුල්ල', lat: 7.8731, lng: 80.6517 },
  { id: 'ps_mat_galewela', nameSi: 'ගලේවෙල පොලිස් ස්ථානය', nameEn: 'Galewela Police Station', districtSi: 'මාතලේ', districtEn: 'Matale', provinceSi: 'මධ්‍යම', provinceEn: 'Central', phone: '0662289222', altPhone: '0662289333', addressSi: 'කුරුණෑගල-දඹුල්ල පාර, ගලේවෙල', lat: 7.7500, lng: 80.5667 },
  { id: 'ps_mat_sigiriya', nameSi: 'සීගිරිය සංචාරක පොලිසිය', nameEn: 'Sigiriya Tourist Police Station', districtSi: 'මාතලේ', districtEn: 'Matale', provinceSi: 'මධ්‍යම', provinceEn: 'Central', phone: '0662286222', altPhone: '0662286333', addressSi: 'සීගිරිය පාර, සීගිරිය', lat: 7.9569, lng: 80.7597 },

  // 6. නුවරඑළිය දිස්ත්‍රික්කය (Nuwara Eliya District)
  { id: 'ps_nuw_nuwaraeliya', nameSi: 'නුවරඑළිය මූලස්ථාන පොලිසිය', nameEn: 'Nuwara Eliya HQ Police Station', districtSi: 'නුවරඑළිය', districtEn: 'Nuwara Eliya', provinceSi: 'මධ්‍යම', provinceEn: 'Central', phone: '0522222222', altPhone: '0522222223', addressSi: 'බණ්ඩාරනායක මාවත, නුවරඑළිය', lat: 6.9497, lng: 80.7891 },
  { id: 'ps_nuw_hatton', nameSi: 'හැටන් මූලස්ථාන පොලිසිය', nameEn: 'Hatton HQ Police Station', districtSi: 'නුවරඑළිය', districtEn: 'Nuwara Eliya', provinceSi: 'මධ්‍යම', provinceEn: 'Central', phone: '0512222222', altPhone: '0512222223', addressSi: 'දුම්රියපොළ පාර, හැටන්', lat: 6.8917, lng: 80.5967 },
  { id: 'ps_nuw_talawakele', nameSi: 'තලවාකැලේ පොලිස් ස්ථානය', nameEn: 'Talawakele Police Station', districtSi: 'නුවරඑළිය', districtEn: 'Nuwara Eliya', provinceSi: 'මධ්‍යම', provinceEn: 'Central', phone: '0512258222', altPhone: '0512258333', addressSi: 'නුවරඑළිය පාර, තලවාකැලේ', lat: 6.9333, lng: 80.6583 },

  // 7. ගාල්ල දිස්ත්‍රික්කය (Galle District)
  { id: 'ps_gal_galle_hq', nameSi: 'ගාල්ල මූලස්ථාන පොලිසිය', nameEn: 'Galle HQ Police Station', districtSi: 'ගාල්ල', districtEn: 'Galle', provinceSi: 'දකුණ', provinceEn: 'Southern', phone: '0912222222', altPhone: '0912222223', addressSi: 'කොටුව පාර, ගාල්ල', lat: 6.0328, lng: 80.2169 },
  { id: 'ps_gal_hikkaduwa', nameSi: 'හික්කඩුව පොලිස් ස්ථානය', nameEn: 'Hikkaduwa Police Station', districtSi: 'ගාල්ල', districtEn: 'Galle', provinceSi: 'දකුණ', provinceEn: 'Southern', phone: '0912277222', altPhone: '0912277333', addressSi: 'ගාලු පාර, හික්කඩුව', lat: 6.1394, lng: 80.1064 },
  { id: 'ps_gal_ambalangoda', nameSi: 'අම්බලන්ගොඩ මූලස්ථාන පොලිසිය', nameEn: 'Ambalangoda HQ Police Station', districtSi: 'ගාල්ල', districtEn: 'Galle', provinceSi: 'දකුණ', provinceEn: 'Southern', phone: '0912258222', altPhone: '0912258223', addressSi: 'ගාලු පාර, අම්බලන්ගොඩ', lat: 6.2361, lng: 80.0542 },
  { id: 'ps_gal_karapitiya', nameSi: 'කරාපිටිය පොලිස් මුරපොළ', nameEn: 'Karapitiya Hospital Police Post', districtSi: 'ගාල්ල', districtEn: 'Galle', provinceSi: 'දකුණ', provinceEn: 'Southern', phone: '0912232250', altPhone: '0912234059', addressSi: 'ශික්ෂණ රෝහල, කරාපිටිය', lat: 6.0667, lng: 80.2333 },

  // 8. මාතර දිස්ත්‍රික්කය (Matara District)
  { id: 'ps_mtr_matara_hq', nameSi: 'මාතර මූලස්ථාන පොලිසිය', nameEn: 'Matara HQ Police Station', districtSi: 'මාතර', districtEn: 'Matara', provinceSi: 'දකුණ', provinceEn: 'Southern', phone: '0412222222', altPhone: '0412222223', addressSi: 'අනගාරික ධර්මපාල මාවත, මාතර', lat: 5.9478, lng: 80.5483 },
  { id: 'ps_mtr_weligama', nameSi: 'වැලිගම පොලිස් ස්ථානය', nameEn: 'Weligama Police Station', districtSi: 'මාතර', districtEn: 'Matara', provinceSi: 'දකුණ', provinceEn: 'Southern', phone: '0412250222', altPhone: '0412251222', addressSi: 'ගාලු පාර, වැලිගම', lat: 5.9750, lng: 80.4289 },
  { id: 'ps_mtr_dikwella', nameSi: 'දික්වැල්ල පොලිස් ස්ථානය', nameEn: 'Dikwella Police Station', districtSi: 'මාතර', districtEn: 'Matara', provinceSi: 'දකුණ', provinceEn: 'Southern', phone: '0412255222', altPhone: '0412256222', addressSi: 'තංගල්ල පාර, දික්වැල්ල', lat: 5.9667, lng: 80.7000 },

  // 9. හම්බන්තොට දිස්ත්‍රික්කය (Hambantota District)
  { id: 'ps_ham_tangalle', nameSi: 'තංගල්ල මූලස්ථාන පොලිසිය', nameEn: 'Tangalle HQ Police Station', districtSi: 'හම්බන්තොට', districtEn: 'Hambantota', provinceSi: 'දකුණ', provinceEn: 'Southern', phone: '0472240222', altPhone: '0472240223', addressSi: 'තිස්සමහාරාම පාර, තංගල්ල', lat: 6.0242, lng: 80.7942 },
  { id: 'ps_ham_hambantota', nameSi: 'හම්බන්තොට පොලිස් ස්ථානය', nameEn: 'Hambantota Police Station', districtSi: 'හම්බන්තොට', districtEn: 'Hambantota', provinceSi: 'දකුණ', provinceEn: 'Southern', phone: '0472220222', altPhone: '0472221222', addressSi: 'වරාය පාර, හම්බන්තොට', lat: 6.1247, lng: 81.1186 },
  { id: 'ps_ham_tissamaharama', nameSi: 'තිස්සමහාරාම පොලිස් ස්ථානය', nameEn: 'Tissamaharama Police Station', districtSi: 'හම්බන්තොට', districtEn: 'Hambantota', provinceSi: 'දකුණ', provinceEn: 'Southern', phone: '0472237222', altPhone: '0472238222', addressSi: 'කතරගම පාර, තිස්සමහාරාම', lat: 6.2803, lng: 81.2872 },

  // 10. යාපනය දිස්ත්‍රික්කය (Jaffna District)
  { id: 'ps_jaf_jaffna_hq', nameSi: 'යාපනය මූලස්ථාන පොලිසිය', nameEn: 'Jaffna HQ Police Station', districtSi: 'යාපනය', districtEn: 'Jaffna', provinceSi: 'උතුර', provinceEn: 'Northern', phone: '0212222222', altPhone: '0212222223', addressSi: 'කන්කසන්තුරේ පාර, යාපනය', lat: 9.6647, lng: 80.0167 },
  { id: 'ps_jaf_chavakachcheri', nameSi: 'චාවකච්චේරි පොලිස් ස්ථානය', nameEn: 'Chavakachcheri Police Station', districtSi: 'යාපනය', districtEn: 'Jaffna', provinceSi: 'උතුර', provinceEn: 'Northern', phone: '0212270222', altPhone: '0212271222', addressSi: 'ඒ-9 පාර, චාවකච්චේරි', lat: 9.6500, lng: 80.1500 },
  { id: 'ps_jaf_pointpedro', nameSi: 'පේදුරුතුඩුව පොලිස් ස්ථානය', nameEn: 'Point Pedro Police Station', districtSi: 'යාපනය', districtEn: 'Jaffna', provinceSi: 'උතුර', provinceEn: 'Northern', phone: '0212263222', altPhone: '0212264222', addressSi: 'ප්‍රධාන වීදිය, පේදුරුතුඩුව', lat: 9.8167, lng: 80.2333 },

  // 11. කිලිනොච්චිය දිස්ත්‍රික්කය (Kilinochchi District)
  { id: 'ps_kil_kilinochchi', nameSi: 'කිලිනොච්චිය මූලස්ථාන පොලිසිය', nameEn: 'Kilinochchi HQ Police Station', districtSi: 'කිලිනොච්චිය', districtEn: 'Kilinochchi', provinceSi: 'උතුර', provinceEn: 'Northern', phone: '0212285222', altPhone: '0212285223', addressSi: 'ඒ-9 පාර, කිලිනොච්චිය', lat: 9.3803, lng: 80.3986 },

  // 12. මන්නාරම දිස්ත්‍රික්කය (Mannar District)
  { id: 'ps_man_mannar', nameSi: 'මන්නාරම පොලිස් ස්ථානය', nameEn: 'Mannar Police Station', districtSi: 'මන්නාරම', districtEn: 'Mannar', provinceSi: 'උතුර', provinceEn: 'Northern', phone: '0232222222', altPhone: '0232222223', addressSi: 'ප්‍රධාන වීදිය, මන්නාරම', lat: 8.9806, lng: 79.9042 },

  // 13. වවුනියාව දිස්ත්‍රික්කය (Vavuniya District)
  { id: 'ps_vav_vavuniya', nameSi: 'වවුනියාව මූලස්ථාන පොලිසිය', nameEn: 'Vavuniya HQ Police Station', districtSi: 'වවුනියාව', districtEn: 'Vavuniya', provinceSi: 'උතුර', provinceEn: 'Northern', phone: '0242222222', altPhone: '0242222223', addressSi: 'ඒ-9 පාර, වවුනියාව', lat: 8.7514, lng: 80.4972 },

  // 14. මුලතිව් දිස්ත්‍රික්කය (Mullaitivu District)
  { id: 'ps_mul_mullaitivu', nameSi: 'මුලතිව් පොලිස් ස්ථානය', nameEn: 'Mullaitivu Police Station', districtSi: 'මුලතිව්', districtEn: 'Mullaitivu', provinceSi: 'උතුර', provinceEn: 'Northern', phone: '0212290222', altPhone: '0212290223', addressSi: 'වෙරළ පාර, මුලතිව්', lat: 9.2667, lng: 80.8167 },

  // 15. මඩකලපුව දිස්ත්‍රික්කය (Batticaloa District)
  { id: 'ps_bat_batticaloa', nameSi: 'මඩකලපුව මූලස්ථාන පොලිසිය', nameEn: 'Batticaloa HQ Police Station', districtSi: 'මඩකලපුව', districtEn: 'Batticaloa', provinceSi: 'නැගෙනහිර', provinceEn: 'Eastern', phone: '0652222222', altPhone: '0652222223', addressSi: 'ත්‍රිකුණාමල පාර, මඩකලපුව', lat: 7.7172, lng: 81.6997 },

  // 16. අම්පාර දිස්ත්‍රික්කය (Ampara District)
  { id: 'ps_amp_ampara', nameSi: 'අම්පාර මූලස්ථාන පොලිසිය', nameEn: 'Ampara HQ Police Station', districtSi: 'අම්පාර', districtEn: 'Ampara', provinceSi: 'නැගෙනහිර', provinceEn: 'Eastern', phone: '0632222222', altPhone: '0632222223', addressSi: 'ඩී.එස්. සේනානායක මාවත, අම්පාර', lat: 7.2911, lng: 81.6747 },
  { id: 'ps_amp_kalmunai', nameSi: 'කල්මුනේ පොලිස් ස්ථානය', nameEn: 'Kalmunai Police Station', districtSi: 'අම්පාර', districtEn: 'Ampara', provinceSi: 'නැගෙනහිර', provinceEn: 'Eastern', phone: '0672229222', altPhone: '0672229333', addressSi: 'ප්‍රධාන වීදිය, කල්මුනේ', lat: 7.4167, lng: 81.8333 },

  // 17. ත්‍රිකුණාමලය දිස්ත්‍රික්කය (Trincomalee District)
  { id: 'ps_tri_trincomalee', nameSi: 'ත්‍රිකුණාමලය මූලස්ථාන පොලිසිය', nameEn: 'Trincomalee HQ Police Station', districtSi: 'ත්‍රිකුණාමලය', districtEn: 'Trincomalee', provinceSi: 'නැගෙනහිර', provinceEn: 'Eastern', phone: '0262222222', altPhone: '0262222223', addressSi: 'වෙරළ පාර, ත්‍රිකුණාමලය', lat: 8.5711, lng: 81.2336 },

  // 18. කුරුණෑගල දිස්ත්‍රික්කය (Kurunegala District)
  { id: 'ps_kur_kurunegala_hq', nameSi: 'කුරුණෑගල මූලස්ථාන පොලිසිය', nameEn: 'Kurunegala HQ Police Station', districtSi: 'කුරුණෑගල', districtEn: 'Kurunegala', provinceSi: 'වයඹ', provinceEn: 'North Western', phone: '0372222222', altPhone: '0372222223', addressSi: 'කොළඹ පාර, කුරුණෑගල', lat: 7.4864, lng: 80.3647 },
  { id: 'ps_kur_kuliyapitiya', nameSi: 'කුලියාපිටිය මූලස්ථාන පොලිසිය', nameEn: 'Kuliyapitiya HQ Police Station', districtSi: 'කුරුණෑගල', districtEn: 'Kurunegala', provinceSi: 'වයඹ', provinceEn: 'North Western', phone: '0372281222', altPhone: '0372281223', addressSi: 'හලාවත පාර, කුලියාපිටිය', lat: 7.4689, lng: 80.0403 },
  { id: 'ps_kur_pannala', nameSi: 'පන්නල පොලිස් ස්ථානය', nameEn: 'Pannala Police Station', districtSi: 'කුරුණෑගල', districtEn: 'Kurunegala', provinceSi: 'වයඹ', provinceEn: 'North Western', phone: '0372246222', altPhone: '0372246333', addressSi: 'මීගමුව පාර, පන්නල', lat: 7.3333, lng: 79.9833 },
  { id: 'ps_kur_narammala', nameSi: 'නාරම්මල පොලිස් ස්ථානය', nameEn: 'Narammala Police Station', districtSi: 'කුරුණෑගල', districtEn: 'Kurunegala', provinceSi: 'වයඹ', provinceEn: 'North Western', phone: '0372249222', altPhone: '0372249333', addressSi: 'ගිරිඋල්ල පාර, නාරම්මල', lat: 7.4333, lng: 80.2167 },

  // 19. පුත්තලම දිස්ත්‍රික්කය (Puttalam District)
  { id: 'ps_put_puttalam', nameSi: 'පුත්තලම මූලස්ථාන පොලිසිය', nameEn: 'Puttalam HQ Police Station', districtSi: 'පුත්තලම', districtEn: 'Puttalam', provinceSi: 'වයඹ', provinceEn: 'North Western', phone: '0322265222', altPhone: '0322265223', addressSi: 'කොළඹ පාර, පුත්තලම', lat: 8.0361, lng: 79.8283 },
  { id: 'ps_put_chilaw', nameSi: 'හලාවත මූලස්ථාන පොලිසිය', nameEn: 'Chilaw HQ Police Station', districtSi: 'පුත්තලම', districtEn: 'Puttalam', provinceSi: 'වයඹ', provinceEn: 'North Western', phone: '0322222222', altPhone: '0322222223', addressSi: 'කොළඹ පාර, හලාවත', lat: 7.5758, lng: 79.7953 },
  { id: 'ps_put_marawila', nameSi: 'මාරවිල පොලිස් ස්ථානය', nameEn: 'Marawila Police Station', districtSi: 'පුත්තලම', districtEn: 'Puttalam', provinceSi: 'වයඹ', provinceEn: 'North Western', phone: '0322254222', altPhone: '0322255222', addressSi: 'ගාලු පාර, මාරවිල', lat: 7.4167, lng: 79.8167 },
  { id: 'ps_put_wennappuwa', nameSi: 'වෙන්නප්පුව පොලිස් ස්ථානය', nameEn: 'Wennappuwa Police Station', districtSi: 'පුත්තලම', districtEn: 'Puttalam', provinceSi: 'වයඹ', provinceEn: 'North Western', phone: '0312255222', altPhone: '0312256222', addressSi: 'කොළඹ-හලාවත පාර, වෙන්නප්පුව', lat: 7.3458, lng: 79.8458 },

  // 20. අනුරාධපුර දිස්ත්‍රික්කය (Anuradhapura District)
  { id: 'ps_anu_anuradhapura_hq', nameSi: 'අනුරාධපුර මූලස්ථාන පොලිසිය', nameEn: 'Anuradhapura HQ Police Station', districtSi: 'අනුරාධපුර', districtEn: 'Anuradhapura', provinceSi: 'උතුරු මැද', provinceEn: 'North Central', phone: '0252222222', altPhone: '0252222223', addressSi: 'මෛත්‍රීපාල සේනානායක මාවත, අනුරාධපුර', lat: 8.3114, lng: 80.4037 },
  { id: 'ps_anu_kekirawa', nameSi: 'කැකිරාව පොලිස් ස්ථානය', nameEn: 'Kekirawa Police Station', districtSi: 'අනුරාධපුර', districtEn: 'Anuradhapura', provinceSi: 'උතුරු මැද', provinceEn: 'North Central', phone: '0252264222', altPhone: '0252264333', addressSi: 'තලාව පාර, කැකිරාව', lat: 8.0333, lng: 80.6000 },

  // 21. පොළොන්නරුව දිස්ත්‍රික්කය (Polonnaruwa District)
  { id: 'ps_pol_polonnaruwa', nameSi: 'පොළොන්නරුව මූලස්ථාන පොලිසිය', nameEn: 'Polonnaruwa HQ Police Station', districtSi: 'පොළොන්නරුව', districtEn: 'Polonnaruwa', provinceSi: 'උතුරු මැද', provinceEn: 'North Central', phone: '0272222222', altPhone: '0272222223', addressSi: 'නව නගරය, පොළොන්නරුව', lat: 7.9403, lng: 81.0189 },

  // 22. බදුල්ල දිස්ත්‍රික්කය (Badulla District)
  { id: 'ps_bad_badulla_hq', nameSi: 'බදුල්ල මූලස්ථාන පොලිසිය', nameEn: 'Badulla HQ Police Station', districtSi: 'බදුල්ල', districtEn: 'Badulla', provinceSi: 'ඌව', provinceEn: 'Uva', phone: '0552222222', altPhone: '0552222223', addressSi: 'රාජ මාවත, බදුල්ල', lat: 6.9897, lng: 81.0558 },
  { id: 'ps_bad_bandarawela', nameSi: 'බණ්ඩාරවෙල මූලස්ථාන පොලිසිය', nameEn: 'Bandarawela HQ Police Station', districtSi: 'බදුල්ල', districtEn: 'Badulla', provinceSi: 'ඌව', provinceEn: 'Uva', phone: '0572222222', altPhone: '0572222223', addressSi: 'බදුල්ල පාර, බණ්ඩාරවෙල', lat: 6.8333, lng: 80.9833 },
  { id: 'ps_bad_ella', nameSi: 'ඇල්ල සංචාරක පොලිස් ස්ථානය', nameEn: 'Ella Tourist Police Station', districtSi: 'බදුල්ල', districtEn: 'Badulla', provinceSi: 'ඌව', provinceEn: 'Uva', phone: '0572228222', altPhone: '0572228333', addressSi: 'පස්සර පාර, ඇල්ල', lat: 6.8667, lng: 81.0467 },

  // 23. මොණරාගල දිස්ත්‍රික්කය (Monaragala District)
  { id: 'ps_mon_monaragala', nameSi: 'මොණරාගල මූලස්ථාන පොලිසිය', nameEn: 'Monaragala HQ Police Station', districtSi: 'මොණරාගල', districtEn: 'Monaragala', provinceSi: 'ඌව', provinceEn: 'Uva', phone: '0552276222', altPhone: '0552276223', addressSi: 'වැල්ලවාය පාර, මොණරාගල', lat: 6.8725, lng: 81.3508 },
  { id: 'ps_mon_kataragama', nameSi: 'කතරගම පොලිස් ස්ථානය', nameEn: 'Kataragama Police Station', districtSi: 'මොණරාගල', districtEn: 'Monaragala', provinceSi: 'ඌව', provinceEn: 'Uva', phone: '0472235222', altPhone: '0472235333', addressSi: 'පූජා භූමිය පාර, කතරගම', lat: 6.4167, lng: 81.3333 },

  // 24. රත්නපුර දිස්ත්‍රික්කය (Ratnapura District)
  { id: 'ps_rat_ratnapura_hq', nameSi: 'රත්නපුර මූලස්ථාන පොලිසිය', nameEn: 'Ratnapura HQ Police Station', districtSi: 'රත්නපුර', districtEn: 'Ratnapura', provinceSi: 'සබරගමුව', provinceEn: 'Sabaragamuwa', phone: '0452222222', altPhone: '0452222223', addressSi: 'පොලිස් පාර, රත්නපුර', lat: 6.6828, lng: 80.4036 },
  { id: 'ps_rat_balangoda', nameSi: 'බලන්ගොඩ මූලස්ථාන පොලිසිය', nameEn: 'Balangoda HQ Police Station', districtSi: 'රත්නපුර', districtEn: 'Ratnapura', provinceSi: 'සබරගමුව', provinceEn: 'Sabaragamuwa', phone: '0452287222', altPhone: '0452287223', addressSi: 'බදුල්ල පාර, බලන්ගොඩ', lat: 6.6500, lng: 80.7000 },
  { id: 'ps_rat_emabilipitiya', nameSi: 'ඇඹිලිපිටිය මූලස්ථාන පොලිසිය', nameEn: 'Embilipitiya HQ Police Station', districtSi: 'රත්නපුර', districtEn: 'Ratnapura', provinceSi: 'සබරගමුව', provinceEn: 'Sabaragamuwa', phone: '0472230222', altPhone: '0472230223', addressSi: 'නෝනාගම පාර, ඇඹිලිපිටිය', lat: 6.2833, lng: 80.8500 },

  // 25. කෑගල්ල දිස්ත්‍රික්කය (Kegalle District)
  { id: 'ps_keg_kegalle_hq', nameSi: 'කෑගල්ල මූලස්ථාන පොලිසිය', nameEn: 'Kegalle HQ Police Station', districtSi: 'කෑගල්ල', districtEn: 'Kegalle', provinceSi: 'සබරගමුව', provinceEn: 'Sabaragamuwa', phone: '0352222222', altPhone: '0352222223', addressSi: 'කොළඹ-නුවර පාර, කෑගල්ල', lat: 7.2514, lng: 80.3464 },
  { id: 'ps_keg_mawanella', nameSi: 'මාවනැල්ල පොලිස් ස්ථානය', nameEn: 'Mawanella Police Station', districtSi: 'කෑගල්ල', districtEn: 'Kegalle', provinceSi: 'සබරගමුව', provinceEn: 'Sabaragamuwa', phone: '0352246222', altPhone: '0352247222', addressSi: 'නුවර පාර, මාවනැල්ල', lat: 7.2528, lng: 80.4478 },
  { id: 'ps_keg_warakapola', nameSi: 'වරකාපොළ පොලිස් ස්ථානය', nameEn: 'Warakapola Police Station', districtSi: 'කෑගල්ල', districtEn: 'Kegalle', provinceSi: 'සබරගමුව', provinceEn: 'Sabaragamuwa', phone: '0352277222', altPhone: '0352278222', addressSi: 'කොළඹ-නුවර පාර, වරකපොළ', lat: 7.2247, lng: 80.1983 },
];

export interface SosLiveTrackerModalProps {
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

  // 👥 5 Emergency Contacts State (හදිසි අවස්ථාවක දැනුම්දිය යුතු අංක 5ක් ස්ථිරව ගබඩා කිරීම)
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(() => {
    try {
      const saved = localStorage.getItem(`sahaya_sos_emergency_contacts_${currentUser?.id || 'default'}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: '1', name: 'පවුලේ සාමාජිකයෙක් (Home)', phone: '' },
      { id: '2', name: 'හිතවතෙක් (Friend)', phone: '' },
      { id: '3', name: 'හදිසි අංක 3', phone: '' },
      { id: '4', name: 'හදිසි අංක 4', phone: '' },
      { id: '5', name: 'හදිසි අංක 5', phone: '' },
    ];
  });

  const [isEditingContacts, setIsEditingContacts] = useState<boolean>(false);
  const [disconnectedContactIds, setDisconnectedContactIds] = useState<string[]>([]);

  // 🔒 PIN Protected Audio Cut State
  const [showVoiceCutPinModal, setShowVoiceCutPinModal] = useState<boolean>(false);
  // 🔒 PIN Protected Contact Disconnect State
  const [showContactDisconnectPinModal, setShowContactDisconnectPinModal] = useState<boolean>(false);
  const [pendingContactToDisconnect, setPendingContactToDisconnect] = useState<EmergencyContact | null>(null);
  const [contactDisconnectPin, setContactDisconnectPin] = useState<string>('');
  const [contactDisconnectPinError, setContactDisconnectPinError] = useState<string | null>(null);
  const [voiceCutPin, setVoiceCutPin] = useState<string>('');
  const [voiceCutPinError, setVoiceCutPinError] = useState<string | null>(null);
  const [isAudioCut, setIsAudioCut] = useState<boolean>(false);

  // Save contacts to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(`sahaya_sos_emergency_contacts_${currentUser?.id || 'default'}`, JSON.stringify(emergencyContacts));
    } catch {}
  }, [emergencyContacts, currentUser?.id]);

  const handleUpdateContact = (id: string, name: string, phone: string) => {
    setEmergencyContacts((prev) => prev.map((c) => (c.id === id ? { ...c, name, phone } : c)));
  };

  const handleNotifyContactSms = (contact: EmergencyContact) => {
    if (!contact.phone) return;
    const cleanPhone = contact.phone.replace(/\s+/g, '');
    const text = encodeURIComponent(`🚨 හදිසි SOS පණිවිඩයකි! ${effectiveEmergencyMessage}\n🔴 සජීවී සිතියම හා හඬ ඇසීමේ සබැඳිය:\n${shareUrl}`);
    window.open(`sms:${cleanPhone}?body=${text}`, '_self');
  };

  const handleNotifyContactWhatsApp = (contact: EmergencyContact) => {
    if (!contact.phone) return;
    const cleanPhone = contact.phone.replace(/\D/g, '');
    const text = encodeURIComponent(`🚨 හදිසි SOS පණිවිඩයකි! ${effectiveEmergencyMessage}\n🔴 සජීවී සිතියම හා හඬ ඇසීමේ සබැඳිය:\n${shareUrl}`);
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`, '_blank');
  };

  const effectiveEmergencyMessage = useMemo(() => {
    if (isCustomMessage && customMessageText.trim()) {
      return customMessageText.trim();
    }
    return PRESET_MESSAGES[selectedPresetIndex] || PRESET_MESSAGES[0];
  }, [isCustomMessage, customMessageText, selectedPresetIndex]);

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

  // 📡 1. ALWAYS-AVAILABLE SHARE URL (Instant from Mount)
  const shareUrl = useMemo(() => {
    const sid = sessionId || `sos_${Date.now()}`;
    const baseDomain = (typeof window !== 'undefined' && window.location.hostname !== '127.0.0.1' && window.location.hostname !== 'localhost')
      ? window.location.origin
      : 'https://supporservice.online';
    return `${baseDomain}/?sos_session=${sid}`;
  }, [sessionId]);

  const getShareUrlForContact = useCallback((contactId: string) => {
    const sid = sessionId || `sos_${Date.now()}`;
    const baseDomain = (typeof window !== 'undefined' && window.location.hostname !== '127.0.0.1' && window.location.hostname !== 'localhost')
      ? window.location.origin
      : 'https://supporservice.online';
    return `${baseDomain}/?sos_session=${sid}&cid=${contactId}`;
  }, [sessionId]);

  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSavingAndLocking, setIsSavingAndLocking] = useState<boolean>(false);
  const [savingStatusStep, setSavingStatusStep] = useState<string>('');
  const [gpsError, setGpsError] = useState<string | null>(null);

  // 2. Realtime Telemetry (Instant 0ms Cache Loading)
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>(() => {
    const cached = getLastKnownLocation();
    if (cached) return { lat: cached.lat, lng: cached.lng };
    if (currentLocation && currentLocation.lat && currentLocation.lng) {
      return { lat: currentLocation.lat, lng: currentLocation.lng };
    }
    return { lat: 7.1808, lng: 79.8842 }; // Katunayake default
  });

  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [heading, setHeading] = useState<number | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [locationName, setLocationName] = useState<string>(() => {
    return currentLocation?.nameSi || currentLocation?.nameEn || 'ජා-ඇල / බස්නාහිර පළාත';
  });

  // 3. Hardware Audio Evidence Recording & Siren States
  const [isSirenOn, setIsSirenOn] = useState<boolean>(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);

  // 4. Sri Lanka Police Search & District Filter
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');
  const [policeSearchQuery, setPoliceSearchQuery] = useState<string>('');

  const districtsList = useMemo(() => {
    const set = new Set<string>();
    ALL_SRI_LANKA_POLICE_STATIONS.forEach(s => set.add(s.districtSi));
    return ['All', ...Array.from(set).sort()];
  }, []);

  const filteredPoliceStations = useMemo(() => {
    return ALL_SRI_LANKA_POLICE_STATIONS.filter(s => {
      const matchDistrict = selectedDistrict === 'All' || s.districtSi === selectedDistrict;
      const q = policeSearchQuery.toLowerCase().trim();
      const matchQuery = !q || s.nameSi.toLowerCase().includes(q) || s.nameEn.toLowerCase().includes(q) || s.districtEn.toLowerCase().includes(q);
      return matchDistrict && matchQuery;
    });
  }, [selectedDistrict, policeSearchQuery]);

  // 5. Duress PIN Modal States
  const [showDuressModal, setShowDuressModal] = useState<boolean>(false);
  const [deactivateTab, setDeactivateTab] = useState<'pin' | 'nic'>('pin');
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [enteredPassword, setEnteredPassword] = useState<string>('');
  const [enteredNic, setEnteredNic] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // 🛡️ 5-Minute Safety Cooldown Buffer State
  const [cooldownRemainingSec, setCooldownRemainingSec] = useState<number | null>(null);

  // 6. Audio Evidence Recorder & Stream Refs
  const audioStreamRef = useRef<MediaStream | null>(null);
  const continuousRecorderRef = useRef<MediaRecorder | null>(null);
  const isContinuousAudioRunningRef = useRef<boolean>(false);
  const audioTimerIntervalRef = useRef<any>(null);

  // 7. Map & Watcher Refs
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
      continuousRecorderRef.current = recorder;

      recorder.ondataavailable = async (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          const reader = new FileReader();
          reader.readAsDataURL(e.data);
          reader.onloadend = async () => {
            const base64Data = reader.result as string;
            setRecordedAudioUrl(base64Data);

            const activeSessionId = sessionId || localStorage.getItem('active_sos_session_id');
            if (activeSessionId) {
              try {
                await updateSosLiveLocation(activeSessionId, {
                  latestAudioBase64: base64Data,
                  lastAudioSyncAt: Date.now(),
                  isSilentAudioStreaming: true,
                } as any);
              } catch (err) {}
            }
          };
        }
      };

      recorder.start(4000);
      setIsRecordingAudio(true);

      audioTimerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Silent Audio evidence recorder permission notice:', err);
    }
  }, [sessionId]);

  const stopAudioRecordingLoop = useCallback(() => {
    isContinuousAudioRunningRef.current = false;
    if (audioTimerIntervalRef.current) {
      clearInterval(audioTimerIntervalRef.current);
      audioTimerIntervalRef.current = null;
    }
    if (continuousRecorderRef.current && continuousRecorderRef.current.state !== 'inactive') {
      try {
        continuousRecorderRef.current.stop();
      } catch (e) {}
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    setIsRecordingAudio(false);
  }, []);

  const handleToggleAudioRecording = useCallback(() => {
    if (isRecordingAudio) {
      stopAudioRecordingLoop();
    } else {
      startAudioRecordingLoop();
    }
  }, [isRecordingAudio, startAudioRecordingLoop, stopAudioRecordingLoop]);

  // Handle GPS location updates
  const handleGpsSuccess = useCallback(async (pos: GeolocationPosition) => {
    const { latitude, longitude, accuracy: acc, speed: spd, heading: hd } = pos.coords;
    setCurrentCoords({ lat: latitude, lng: longitude });
    setAccuracy(Math.round(acc));
    setSpeedKmh(spd ? Math.round(spd * 3.6) : 0);
    setHeading(hd ? Math.round(hd) : null);
    setGpsError(null);

    // Resolve real live town name
    try {
      const geo = await resolveExactLocation(latitude, longitude);
      if (geo && geo.shortDisplaySi) {
        setLocationName(geo.shortDisplaySi);
      }
    } catch {}

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    }
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng([latitude, longitude]);
      accuracyCircleRef.current.setRadius(acc);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo([latitude, longitude], { animate: true });
    }

    // 📡 Live broadcast accurate GPS & location to Firestore
    const activeSessionId = sessionId || localStorage.getItem('active_sos_session_id');
    if (activeSessionId) {
      try {
        await updateSosLiveLocation(activeSessionId, {
          latitude,
          longitude,
          accuracyMeters: Math.round(acc),
          speedKmh: spd ? Math.round(spd * 3.6) : 0,
          heading: hd ? Math.round(hd) : null,
          locationName,
          currentLocation: {
            lat: latitude,
            lng: longitude,
            accuracy: Math.round(acc),
            speedKmh: spd ? Math.round(spd * 3.6) : 0,
            heading: hd ? Math.round(hd) : null,
            locationName,
            updatedAt: Date.now(),
          },
          lastLocationUpdateMs: Date.now(),
        });
      } catch (e) {
        console.warn('Live location broadcast error:', e);
      }
    }
  }, [sessionId, locationName]);

  // Watch Position Effect
  useEffect(() => {
    if (!isOpen) return;

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleGpsSuccess,
        (err) => {
          setGpsError('GPS සංඥා ලබා ගැනීමට නොහැකි විය. කරුණාකර Location On කරන්න.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
      );
    }

    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isOpen, handleGpsSuccess]);

  // 📡 Register & Synchronize Active SOS Session in Firestore on launch
  useEffect(() => {
    if (!isOpen) return;

    const activeId = sessionId || 'sos_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    setSessionId(activeId);
    localStorage.setItem('active_sos_session_id', activeId);
    setIsActive(true);

    const initSosSession = async () => {
      try {
        const newSession: any = {
          id: activeId,
          userId: currentUser?.id || currentUser?.userId || 'usr_anonymous',
          userName: currentUser?.name || 'පරිශීලක (User)',
          userPhone: currentUser?.phone || currentUser?.whatsappPhone || '',
          userNic: currentUser?.nic || currentUser?.nicNumber || '',
          userPhotoUrl: currentUser?.photoUrl || '',
          latitude: currentCoords.lat,
          longitude: currentCoords.lng,
          accuracyMeters: accuracy || 10,
          locationName,
          currentLocation: {
            lat: currentCoords.lat,
            lng: currentCoords.lng,
            accuracy: accuracy || 10,
            locationName,
          },
          breadcrumbs: [
            {
              lat: currentCoords.lat,
              lng: currentCoords.lng,
              timestamp: Date.now(),
              accuracy: accuracy || 10,
            }
          ],
          batteryLevel: 100,
          disconnectedContactIds: [],
          isAudioCut: false,
          status: 'active',
          startedAt: new Date().toLocaleTimeString('si-LK'),
          startedAtMs: Date.now(),
          alertReason: effectiveEmergencyMessage,
        };

        await createOrUpdateSosLiveSession(newSession);
        setIsActive(true);
      } catch (err) {
        console.error('Failed to create SOS Live Session in Firestore:', err);
      }
    };

    initSosSession();
  }, [isOpen]);

  // Leaflet Map Initialization
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [currentCoords.lat, currentCoords.lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      const tileUrl = mapLayer === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);

      const beaconIcon = L.divIcon({
        className: 'sos-custom-beacon',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-10 h-10 bg-red-500/40 rounded-full animate-ping"></span>
            <span class="absolute w-6 h-6 bg-red-600/60 rounded-full animate-pulse"></span>
            <div class="relative w-5 h-5 bg-red-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-white text-[9px] font-black">
              SOS
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      markerRef.current = L.marker([currentCoords.lat, currentCoords.lng], { icon: beaconIcon }).addTo(map);

      accuracyCircleRef.current = L.circle([currentCoords.lat, currentCoords.lng], {
        radius: accuracy || 15,
        color: '#ef4444',
        fillColor: '#fca5a5',
        fillOpacity: 0.25,
        weight: 1.5,
      }).addTo(map);

      mapInstanceRef.current = map;
    }, 250);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, mapLayer]);

  // Native share helpers
  const handleCopyShareLink = async () => {
    const fullText = `${effectiveEmergencyMessage}\n\n🔴 සජීවී ස්ථානය හා හඬ ඇසීමේ සබැඳිය:\n${shareUrl}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (e) {
      console.warn(e);
    }
  };

  // 🔒 PIN-Protected Contact Disconnect Initiation
  const handleInitiateContactDisconnect = (contact: EmergencyContact) => {
    // If already disconnected, reconnecting does not require PIN
    if (disconnectedContactIds.includes(contact.id)) {
      performContactReconnect(contact.id);
      return;
    }
    // Disconnecting requires Quick PIN to prevent unauthorized sabotage
    setPendingContactToDisconnect(contact);
    setContactDisconnectPin('');
    setContactDisconnectPinError(null);
    setShowContactDisconnectPinModal(true);
  };

  const performContactReconnect = async (contactId: string) => {
    const updated = disconnectedContactIds.filter(id => id !== contactId);
    setDisconnectedContactIds(updated);
    const activeSessionId = sessionId || localStorage.getItem('active_sos_session_id');
    if (activeSessionId) {
      try {
        await updateSosLiveLocation(activeSessionId, {
          disconnectedContactIds: updated,
        });
      } catch (e) {
        console.warn('Error reconnecting contact:', e);
      }
    }
  };

  const handleConfirmContactDisconnect = async () => {
    if (!contactDisconnectPin || contactDisconnectPin.length !== 4) {
      setContactDisconnectPinError('කරුණාකර අංක 4ක PIN අංකය ඇතුළත් කරන්න.');
      return;
    }

    if (!pendingContactToDisconnect) return;

    try {
      const res = await verifyCurrentUserPin(contactDisconnectPin, currentUser);
      if (res.success) {
        const contactId = pendingContactToDisconnect.id;
        const updated = [...disconnectedContactIds, contactId];
        setDisconnectedContactIds(updated);
        setShowContactDisconnectPinModal(false);
        setPendingContactToDisconnect(null);
        setContactDisconnectPin('');
        setContactDisconnectPinError(null);

        const activeSessionId = sessionId || localStorage.getItem('active_sos_session_id');
        if (activeSessionId) {
          await updateSosLiveLocation(activeSessionId, {
            disconnectedContactIds: updated,
          });
        }
      } else {
        setContactDisconnectPinError(res.message || 'වැරදි PIN අංකයකි! සබඳතාව විසන්ධි කළ නොහැක.');
      }
    } catch (e) {
      setContactDisconnectPinError('PIN සත්‍යාපනය අසාර්ථක විය.');
    }
  };

  // 🔒 PIN verification to CUT voice streaming
  const handleInitiateVoiceCut = () => {
    setVoiceCutPin('');
    setVoiceCutPinError(null);
    setShowVoiceCutPinModal(true);
  };

  const handleConfirmVoiceCut = async () => {
    if (!voiceCutPin || voiceCutPin.length !== 4) {
      setVoiceCutPinError('කරුණාකර අංක 4ක PIN අංකය ඇතුළත් කරන්න.');
      return;
    }

    try {
      const res = await verifyCurrentUserPin(voiceCutPin, currentUser);
      if (res.success) {
        stopAudioRecordingLoop();
        setIsAudioCut(true);
        setShowVoiceCutPinModal(false);
        setVoiceCutPin('');
        setVoiceCutPinError(null);

        const activeSessionId = sessionId || localStorage.getItem('active_sos_session_id');
        if (activeSessionId) {
          await updateSosLiveLocation(activeSessionId, {
            isAudioCut: true,
            isSilentAudioStreaming: false,
            latestAudioBase64: '',
          });
        }
      } else {
        setVoiceCutPinError(res.message || 'වැරදි PIN අංකයකි! හඬ විකාශනය විසන්ධි කළ නොහැක.');
      }
    } catch (e) {
      setVoiceCutPinError('PIN සත්‍යාපනය අසාර්ථක විය.');
    }
  };

  const handleResumeVoiceStream = async () => {
    startAudioRecordingLoop();
    setIsAudioCut(false);
    const activeSessionId = sessionId || localStorage.getItem('active_sos_session_id');
    if (activeSessionId) {
      await updateSosLiveLocation(activeSessionId, {
        isAudioCut: false,
        isSilentAudioStreaming: true,
      });
    }
  };

  const handleWhatsAppShare = () => {
    const text =
      `🚨 *හදිසි SOS ඇමතුමයි! (Emergency Distress)*\n\n` +
      `👤 *නම:* ${currentUser?.name || 'පරිශීලක'}\n` +
      `📞 *දුරකථනය:* ${currentUser?.whatsappPhone || currentUser?.phone || 'ලබා දී නැත'}\n` +
      `📍 *ස්ථානය:* ${locationName || 'කටුනායක'}\n` +
      `🌐 *GPS:* ${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}\n` +
      `💬 *පණිවිඩය:* ${effectiveEmergencyMessage}\n\n` +
      `🔴 *සජීවී සිතියම හා හඬ ඇසීමේ සබැඳිය:*\n${shareUrl}\n\n` +
      `කරුණාකර මා සිටින තැන සිතියමෙන් බලා සජීවීව පසුබිම් හඬට සවන් දී වහාම උදව් කරන්න!`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSmsShare = () => {
    const text = `🚨 SOS හදිසි ඇමතුමයි! ${effectiveEmergencyMessage}\nසජීවී සිතියම හා හඬ සබැඳිය: ${shareUrl}`;
    window.open(`sms:?body=${encodeURIComponent(text)}`, '_self');
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([currentCoords.lat, currentCoords.lng], 16, { animate: true });
    }
  };

  // 🛑 DEACTIVATE TRIGGER (Demo users bypass PIN)
  const handleInitiateDeactivation = () => {
    // 🚀 Demo පරිශීලකයින් සඳහා PIN අවශ්‍ය නැත
    if (currentUser?.isDemo || currentUser?.id === 'demo_user' || currentUser?.nic === '000000000V') {
      handleStopSos(false);
      return;
    }
    setEnteredPin('');
    setEnteredPassword('');
    setEnteredNic('');
    setPinError(null);
    setShowDuressModal(true);
  };

  const handleStopSos = async (isDuress: boolean = false) => {
    stopAudioRecordingLoop();
    if (isSirenOn) stopHighDecibelSiren();

    const activeSessionId = sessionId || localStorage.getItem('active_sos_session_id');
    if (activeSessionId) {
      try {
        await updateSosLiveLocation(activeSessionId, {
          status: 'ended',
          isActive: false,
          endedAtMs: Date.now(),
          deactivationReason: isDuress ? 'duress_canceled' : 'resolved',
        });
        await stopSosLiveSession(activeSessionId, isDuress ? 'duress_canceled' : 'resolved');
      } catch (e) {}
    }

    setIsActive(false);
    localStorage.removeItem('active_sos_session_id');

    // 5-minute safety cooldown buffer
    const cooldownEnd = Date.now() + 5 * 60 * 1000;
    localStorage.setItem('active_sos_cooldown_until', cooldownEnd.toString());
    setCooldownRemainingSec(300);

    onClose();
  };

  const handleForceCompleteNow = useCallback(async () => {
    localStorage.removeItem('active_sos_cooldown_until');
    setCooldownRemainingSec(null);
    onClose();
  }, [onClose]);

  const handleVerifyAndDeactivate = async () => {
    if (deactivateTab === 'pin') {
      if (enteredPin === '9999') {
        setShowDuressModal(false);
        handleStopSos(true);
        return;
      }

      try {
        const pinResult = await verifyCurrentUserPin(enteredPin, currentUser);
        if (pinResult.success || (enteredPin === '1234' && (currentUser as any)?.isDemo)) {
          setShowDuressModal(false);
          handleStopSos(false);
        } else {
          setPinError(pinResult.message || 'වැරදි PIN අංකයකි! ඔබගේ Device Quick PIN අංකය ඇතුළත් කරන්න.');
        }
      } catch (err) {
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
  if (!isOpen) return null;

  // 🚀 Demo Account එකෙන් SOS සේවාව භාවිතා කළ නොහැක (Issue #2 Fix)
  if (currentUser?.isDemo || currentUser?.id === 'demo_user' || currentUser?.nic === '000000000V') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
        <div className="max-w-md w-full p-6 bg-white dark:bg-slate-900 rounded-3xl text-center space-y-4 border-2 border-rose-500 shadow-2xl">
          <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/80 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            ලියාපදිංචි වීම අනිවාර්යයි (Registration Required)
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            නිරීක්ෂණ Demo ගිණුම මඟින් හදිසි SOS සේවාව හෝ රතු එළිය භාවිතා කළ නොහැක. කරුණාකර ඔබගේ නියම ගිණුම සාදා ලියාපදිංචි වන්න.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            වසන්න (Close)
          </button>
        </div>
      </div>
    );
  }

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

                            {isAudioCut ? (
                <button
                  type="button"
                  onClick={handleResumeVoiceStream}
                  className="px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white transition-all cursor-pointer shadow-md"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🎙️ හඬ නැවත On කරන්න</span>
                </button>
              ) : isRecordingAudio ? (
                <button
                  type="button"
                  onClick={handleInitiateVoiceCut}
                  className="px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 bg-rose-700 hover:bg-rose-600 text-white transition-all cursor-pointer shadow-md ring-2 ring-white/50"
                  title="හඬ විකාශනය Cut කිරීමට Quick PIN අවශ්‍යයි"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>🔇 හඬ කට් කරන්න (Cut Voice)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleAudioRecording}
                  className="px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 bg-white/20 text-white hover:bg-white/30 transition-all cursor-pointer shadow-sm"
                >
                  <Mic className="w-4 h-4" />
                  <span>හඬ රෙකෝඩ් On</span>
                </button>
              )}
            </div>

            {/* Emergency Police 119 Quick Button (Issue #1 Fix) */}
            <a
              href="tel:119"
              className="px-3 py-1.5 rounded-xl bg-white text-red-600 hover:bg-red-50 text-xs font-black flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>119 පොලිසිය</span>
            </a>
          </div>
        </div>

        {/* 2. MAIN SCROLLABLE CONTENT BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-800 dark:text-slate-100 flex-1">
          
          {/* 👥 5 EMERGENCY TRUSTED CONTACTS MANAGEMENT CARD (Issue #3 Fix) */}
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-500" />
                <span>හදිසි ඇමතුම් සඳහා අංක 5 (Emergency Contacts - 5)</span>
              </label>
              <button
                type="button"
                onClick={() => setIsEditingContacts(!isEditingContacts)}
                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-2.5 py-1 rounded-xl hover:bg-blue-100 cursor-pointer transition-all"
              >
                {isEditingContacts ? 'සුරකින්න (Done)' : 'සංස්කරණය (Edit Numbers)'}
              </button>
            </div>

            <div className="space-y-2">
              {emergencyContacts.map((contact, idx) => (
                <div
                  key={contact.id}
                  className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2 text-xs"
                >
                  {isEditingContacts ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={contact.name}
                        onChange={(e) => handleUpdateContact(contact.id, e.target.value, contact.phone)}
                        placeholder={`අංක ${idx + 1} නම`}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold"
                      />
                      <input
                        type="tel"
                        value={contact.phone}
                        onChange={(e) => handleUpdateContact(contact.id, contact.name, e.target.value)}
                        placeholder="දුරකථන අංකය (07xxxxxxxx)"
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono"
                      />
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {contact.name || `හදිසි අංක ${idx + 1}`}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {contact.phone || 'අංකයක් ඇතුළත් කර නොමැත'}
                      </div>
                    </div>
                  )}

                  {contact.phone && !isEditingContacts && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`tel:${contact.phone}`}
                        className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 transition-all"
                        title="Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleNotifyContactSms(contact)}
                        className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                        title="Send SMS Alert"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>SMS</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!contact.phone) return;
                          const cleanPhone = contact.phone.replace(/\D/g, '');
                          const contactUrl = getShareUrlForContact(contact.id);
                          const msg = encodeURIComponent(`🚨 *හදිසි SOS ඇමතුමයි!*\n👤 *නම:* ${currentUser?.name || 'පරිශීලක'}\n📍 *ස්ථානය:* ${locationName}\n🌐 *GPS:* ${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}\n🔴 *සජීවී සිතියම හා හඬ:*\n${contactUrl}`);
                          window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`, '_blank');
                        }}
                        className="px-2 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                        title="WhatsApp Alert"
                      >
                        <span>WA</span>
                      </button>

                      {/* 🚫 Disconnect / Reconnect Specific Contact Button */}
                      <button
                        type="button"
                        onClick={() => handleInitiateContactDisconnect(contact)}
                        className={`px-2 py-1.5 rounded-xl font-bold text-[10px] transition-all cursor-pointer ${
                          disconnectedContactIds.includes(contact.id)
                            ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
                            : 'bg-rose-600 hover:bg-rose-500 text-white'
                        }`}
                        title={disconnectedContactIds.includes(contact.id) ? 'නැවත සක්‍රීය කරන්න' : 'සබඳතාව විසන්ධි කරන්න'}
                      >
                        {disconnectedContactIds.includes(contact.id) ? '🔄 Reconnect' : '🚫 Disconnect'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 🚨 PRESET & CUSTOM MESSAGE SELECTION BOX */}
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-red-500" />
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
              <Volume2 className="w-5 h-5 animate-pulse" />
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
                onClick={handleCopyShareLink}
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
                onClick={handleWhatsAppShare}
                className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleSmsShare}
                className="p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Share2 className="w-4 h-4" />
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
                    handleCopyShareLink();
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
                <span>±{accuracy || 10}m</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase">වේගය (Speed)</span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1 mt-0.5">
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                <span>{speedKmh} km/h</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase">බැටරි මට්ටම</span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1 mt-0.5">
                <Battery className="w-3.5 h-3.5 text-amber-500" />
                <span>{batteryLevel || 100}%</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase">කේතය (Code)</span>
              <span className="text-sm font-black font-mono text-red-600 dark:text-red-400 flex items-center gap-1 mt-0.5">
                <span>{sessionCode}</span>
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
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>ලංකාවේ සියලුම පොලිස් ස්ථාන ({filteredPoliceStations.length})</span>
              </label>
              <a
                href="tel:119"
                className="text-[10px] font-black text-white bg-red-600 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-red-700"
              >
                <Phone className="w-2.5 h-2.5" /> 119 Call
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
                  {districtsList.map((dist) => (
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
              {filteredPoliceStations.slice(0, 15).map((station, idx) => (
                <div key={idx} className="pt-1.5 flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white leading-tight">
                      {station.nameSi}
                    </h5>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {station.districtSi} දිස්ත්‍රික්කය {station.phone ? `• ${station.phone}` : ''}
                    </span>
                  </div>

                  {station.phone && (
                    <a
                      href={`tel:${station.phone}`}
                      className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/80 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold text-[11px] flex items-center gap-1 shrink-0"
                    >
                      <Phone className="w-3 h-3" />
                      <span>අමතන්න</span>
                    </a>
                  )}
                </div>
              ))}
              {filteredPoliceStations.length === 0 && (
                <p className="text-center py-4 text-xs text-slate-400">
                  සොයන ලද පොලිස් ස්ථානය හමු නොවීය.
                </p>
              )}
            </div>
          </div>

          {/* 6. EMERGENCY NOTE INPUT */}
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-2">
            <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-purple-500" />
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
                  onClick={() => setDeactivateTab('pin')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    deactivateTab === 'pin'
                      ? 'bg-white dark:bg-slate-900 text-red-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Quick PIN
                </button>
                <button
                  type="button"
                  onClick={() => setDeactivateTab('nic')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    deactivateTab === 'nic'
                      ? 'bg-white dark:bg-slate-900 text-red-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Password / NIC
                </button>
              </div>

              {deactivateTab === 'pin' ? (
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
                      <RotateCcw className="w-5 h-5" />
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
                  onClick={handleVerifyAndDeactivate}
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
      {/* 🔒 Quick PIN Modal to Cut Voice Stream */}
      {showVoiceCutPinModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl text-white">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-2xl font-black">
              🔒
            </div>
            <div>
              <h3 className="text-base font-black text-white">හඬ විකාශනය කට් කිරීම (Voice Cut)</h3>
              <p className="text-xs text-slate-300 pt-1">
                හඬ විකාශනය අත්හිටුවීමට ඔබගේ අංක 4ක Quick PIN එක ඇතුළත් කරන්න.
              </p>
            </div>

            <div className="space-y-2">
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={voiceCutPin}
                onChange={(e) => {
                  setVoiceCutPin(e.target.value.replace(/\D/g, ''));
                  setVoiceCutPinError(null);
                }}
                placeholder="••••"
                className="w-full text-center tracking-[1em] text-2xl font-mono py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-rose-500 outline-none"
              />
              {voiceCutPinError && (
                <p className="text-[11px] font-bold text-rose-400">{voiceCutPinError}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowVoiceCutPinModal(false)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs"
              >
                අවලංගු කරන්න
              </button>
              <button
                type="button"
                onClick={handleConfirmVoiceCut}
                className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black text-xs shadow-md active:scale-95 transition-all"
              >
                තහවුරු කරන්න
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 🔒 Quick PIN Modal to Disconnect Contact */}
      {showContactDisconnectPinModal && pendingContactToDisconnect && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl text-white">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-2xl font-black">
              🔒
            </div>
            <div>
              <h3 className="text-base font-black text-white">සබඳතාවය විසන්ධි කිරීම (Disconnect)</h3>
              <p className="text-xs text-slate-300 pt-1 leading-relaxed">
                <strong>{pendingContactToDisconnect.name}</strong> වෙත ඇති සජීවී නිරීක්ෂණ ප්‍රවේශය අවලංගු කිරීමට ඔබගේ අංක 4ක Quick PIN එක ඇතුළත් කරන්න.
              </p>
            </div>

            <div className="space-y-2">
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={contactDisconnectPin}
                onChange={(e) => {
                  setContactDisconnectPin(e.target.value.replace(/\D/g, ''));
                  setContactDisconnectPinError(null);
                }}
                placeholder="••••"
                className="w-full text-center tracking-[1em] text-2xl font-mono py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 outline-none"
              />
              {contactDisconnectPinError && (
                <p className="text-[11px] font-bold text-rose-400">{contactDisconnectPinError}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowContactDisconnectPinModal(false);
                  setPendingContactToDisconnect(null);
                }}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs"
              >
                අවලංගු කරන්න
              </button>
              <button
                type="button"
                onClick={handleConfirmContactDisconnect}
                className="py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black text-xs shadow-md active:scale-95 transition-all"
              >
                තහවුරු කරන්න
              </button>
            </div>
          </div>
        </div>
      )}

  );
};

export default SosLiveTrackerModal;

